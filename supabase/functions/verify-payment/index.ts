// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function addDays(iso: string | null, days: number): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(+d)) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const { payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, simulated } = body;
    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id required" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment, error: pErr } = await supabase
      .from("payments").select("*").eq("id", payment_id).single();
    if (pErr || !payment) {
      return new Response(JSON.stringify({ error: "payment not found" }), { status: 404, headers: { ...cors, "content-type": "application/json" } });
    }

    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!simulated && keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const expected = await hmacHex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
      if (expected !== razorpay_signature) {
        await supabase.from("payments").update({ status: "failed" }).eq("id", payment_id);
        return new Response(JSON.stringify({ error: "invalid signature" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
      }
    }

    await supabase.from("payments").update({
      status: "paid",
      gateway_ref: razorpay_payment_id ?? payment.gateway_ref,
    }).eq("id", payment_id);

    const { data: booking } = await supabase
      .from("bookings").select("*").eq("id", payment.booking_id).single();

    if (booking) {
      await supabase.from("bookings").update({
        status: "confirmed",
        escrow_status: "held",
        delivery_status: "not_started",
      }).eq("id", booking.id);

      if (booking.quote_id) {
        await supabase.from("quotes").update({ status: "accepted" }).eq("id", booking.quote_id);
      }
      if (booking.inquiry_id) {
        await supabase.from("inquiries").update({ status: "accepted" }).eq("id", booking.inquiry_id);
      }

      // Seed default delivery milestones (idempotent: skip if any already exist)
      const { count } = await supabase
        .from("delivery_milestones")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", booking.id);
      if (!count) {
        const ev = booking.event_date;
        await supabase.from("delivery_milestones").insert([
          { booking_id: booking.id, title: "Sneak peek (selects)", description: "A small set of edited preview images.", due_date: addDays(ev, 5), position: 1, is_final: false },
          { booking_id: booking.id, title: "Edited highlights", description: "Edited highlight gallery.", due_date: addDays(ev, 30), position: 2, is_final: false },
          { booking_id: booking.id, title: "Full gallery & album", description: "Complete edited gallery / album. Approving this releases escrow.", due_date: addDays(ev, 60), position: 3, is_final: true },
        ]);
      }
    }

    return new Response(JSON.stringify({ ok: true, booking_id: payment.booking_id }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
