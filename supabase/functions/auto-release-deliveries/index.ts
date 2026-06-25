// deno-lint-ignore-file no-explicit-any
// Daily scheduled job: auto-approves final milestones older than AUTO_RELEASE_DAYS,
// releases escrow, and sends reminders to photographers (overdue) and customers
// (awaiting review).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AUTO_RELEASE_DAYS = 7;

async function sendEmail(supabase: any, event: string, recipients: any[], data: any) {
  try {
    await supabase.functions.invoke("send-email", { body: { event, recipients, data } });
  } catch (e) { console.warn("[notify]", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const cutoff = new Date(now.getTime() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const todayIso = now.toISOString().slice(0, 10);
    const soonIso = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let autoReleased = 0;
    let reminders = 0;

    // 1) Auto-approve final milestones submitted > AUTO_RELEASE_DAYS ago
    const { data: stale } = await supabase
      .from("delivery_milestones")
      .select("id, booking_id, title")
      .eq("is_final", true)
      .eq("status", "submitted")
      .lt("submitted_at", cutoff);

    for (const m of (stale ?? [])) {
      await supabase.from("delivery_milestones")
        .update({ status: "approved", approved_at: new Date().toISOString(), note: "Auto-approved after no customer response within window." })
        .eq("id", m.id);

      const { data: b } = await supabase.from("bookings")
        .select("id, customer_id, photographer_id, photographers(business_name, profile_id)")
        .eq("id", m.booking_id).maybeSingle();

      await supabase.from("bookings").update({
        status: "completed",
        delivery_status: "delivered",
        escrow_status: "released",
      }).eq("id", m.booking_id);

      await supabase.from("payments").update({ payout_status: "paid" })
        .eq("booking_id", m.booking_id).eq("status", "paid");

      const recipients: any[] = [];
      if (b?.customer_id) recipients.push({ user_id: b.customer_id });
      if ((b as any)?.photographers?.profile_id) recipients.push({ user_id: (b as any).photographers.profile_id });
      await sendEmail(supabase, "booking_confirmed", recipients, {
        booking_id: m.booking_id,
        subject_override: "Delivery auto-approved — payment released",
        message: "The final delivery was auto-approved after the review window passed.",
      });
      autoReleased++;
    }

    // 2) Reminders to customers: submitted milestones awaiting their review
    const { data: pendingReview } = await supabase
      .from("delivery_milestones")
      .select("id, booking_id, title, submitted_at, is_final, bookings!inner(customer_id, photographers(business_name))")
      .eq("status", "submitted");

    for (const m of (pendingReview ?? []) as any[]) {
      // Send daily reminder if submitted >= 2 days ago
      const submittedAt = m.submitted_at ? new Date(m.submitted_at) : null;
      if (!submittedAt || (now.getTime() - submittedAt.getTime()) < 2 * 24 * 60 * 60 * 1000) continue;
      const recipients = m.bookings?.customer_id ? [{ user_id: m.bookings.customer_id }] : [];
      if (!recipients.length) continue;
      await supabase.from("notifications").insert({
        user_id: m.bookings.customer_id,
        type: "delivery_review_reminder",
        title: `Please review: ${m.title}`,
        body: `${m.bookings.photographers?.business_name ?? "Your photographer"} submitted your delivery — please approve or raise an issue.`,
        link: `/bookings/${m.booking_id}`,
      });
      reminders++;
    }

    // 3) Reminders to photographers: milestones due soon or overdue
    const { data: dueSoon } = await supabase
      .from("delivery_milestones")
      .select("id, booking_id, title, due_date, status, bookings!inner(photographer_id, photographers(profile_id, business_name))")
      .eq("status", "pending")
      .lte("due_date", soonIso);

    for (const m of (dueSoon ?? []) as any[]) {
      const profileId = m.bookings?.photographers?.profile_id;
      if (!profileId) continue;
      const overdue = m.due_date && m.due_date < todayIso;
      await supabase.from("notifications").insert({
        user_id: profileId,
        type: overdue ? "milestone_overdue" : "milestone_due_soon",
        title: overdue ? `Overdue: ${m.title}` : `Due soon: ${m.title}`,
        body: `Delivery milestone ${overdue ? "is overdue" : "is due soon"} — please submit the gallery.`,
        link: `/studio/deliverables`,
      });
      reminders++;
    }

    return new Response(JSON.stringify({ ok: true, auto_released: autoReleased, reminders }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
