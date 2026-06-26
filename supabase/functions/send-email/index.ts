// Single edge function for all PhotoLancer transactional email + matching
// in-app notifications. Reads RESEND_API_KEY from env; if missing, logs
// instead of sending so the app still works in dev.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// === Sender config (edit these to switch domain) ===
const FROM_EMAIL = "onboarding@resend.dev";
const FROM_NAME = "PhotoLancer";
// ====================================================

const APP_URL = Deno.env.get("APP_URL") ?? "https://photolancer.lovable.app";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type EventName =
  | "welcome"
  | "new_inquiry"
  | "quote_received"
  | "booking_confirmed"
  | "new_message"
  | "review_request"
  | "new_application";

interface Recipient {
  user_id?: string;       // profile id → notification + email lookup
  email?: string;         // override email
  name?: string;
}

interface Payload {
  event: EventName;
  recipients: Recipient[];
  data?: Record<string, unknown>;
}

// ---- Templates ----
function shell(title: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="border-radius:999px;background:linear-gradient(135deg,#FFB23A 0%,#FF6A00 100%);">
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-weight:800;font-size:15px;color:#ffffff;text-decoration:none;border-radius:999px;">${ctaLabel}</a>
      </td></tr></table>` : "";
  return `<!doctype html><html><body style="margin:0;background:#FFF7EC;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#2A1E0A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7EC;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #F1E6D2;border-radius:24px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#FFB23A 0%,#FF6A00 100%);text-align:center;vertical-align:middle;color:#fff;font-weight:800;font-family:Arial,sans-serif;">◎</td>
            <td style="padding-left:10px;font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:800;font-size:20px;color:#2A1E0A;">PhotoLancer</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:16px 32px 8px 32px;">
          <h1 style="margin:0 0 8px 0;font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:800;font-size:24px;line-height:1.25;color:#2A1E0A;">${title}</h1>
          <div style="font-size:15px;line-height:1.6;color:#3F2F12;">${body}</div>
          ${cta}
        </td></tr>
        <tr><td style="padding:8px 32px 28px 32px;border-top:1px solid #F1E6D2;color:#8a7553;font-size:12px;">
          You're receiving this because of activity on your PhotoLancer account.<br/>
          © ${new Date().getFullYear()} PhotoLancer · <a href="${APP_URL}" style="color:#B5550A;text-decoration:none;">photolancer.lovable.app</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function templateFor(event: EventName, name: string | undefined, data: Record<string, unknown>) {
  const hi = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const link = (path: string) => `${APP_URL}${path.startsWith("/") ? path : "/" + path}`;
  switch (event) {
    case "welcome":
      return {
        subject: "Welcome to PhotoLancer ✨",
        title: "Welcome to PhotoLancer",
        body: `<p>${hi}</p><p>We're so glad you're here. PhotoLancer is India's photographer marketplace — discover photographers you'll love, message and book them, all in one warm place.</p><p>Take a minute to look around. We think you'll feel right at home.</p>`,
        cta: { label: "Explore PhotoLancer", url: link("/") },
        notif: { type: "welcome", title: "Welcome to PhotoLancer", body: "Glad to have you here — start exploring.", link: "/" },
      };
    case "new_inquiry":
      return {
        subject: `New inquiry from ${data.customer_name ?? "a client"}`,
        title: "You've got a new inquiry",
        body: `<p>${hi}</p><p><strong>${escapeHtml(String(data.customer_name ?? "A client"))}</strong> just sent you an inquiry${data.event_type ? ` for <strong>${escapeHtml(String(data.event_type))}</strong>` : ""}${data.city ? ` in <strong>${escapeHtml(String(data.city))}</strong>` : ""}.</p>${data.message ? `<blockquote style="border-left:3px solid #FFB23A;padding:6px 12px;color:#3F2F12;background:#FFF7EC;border-radius:8px;">${escapeHtml(String(data.message))}</blockquote>` : ""}<p>Reply within 24 hours to stay top-ranked.</p>`,
        cta: { label: "Open the inquiry", url: link(`/inquiries/${data.inquiry_id}`) },
        notif: { type: "new_inquiry", title: `New inquiry from ${data.customer_name ?? "a client"}`, body: data.event_type ? `For ${data.event_type}` : "Tap to reply", link: `/inquiries/${data.inquiry_id}` },
      };
    case "quote_received":
      return {
        subject: `You've got a quote from ${data.photographer_name ?? "a photographer"}`,
        title: "A photographer sent you a quote",
        body: `<p>${hi}</p><p><strong>${escapeHtml(String(data.photographer_name ?? "A photographer"))}</strong> just shared a quote with you${data.amount ? ` for <strong>₹${Number(data.amount).toLocaleString("en-IN")}</strong>` : ""}.</p>${data.notes ? `<p>${escapeHtml(String(data.notes))}</p>` : ""}`,
        cta: { label: "View the quote", url: link(`/inquiries/${data.inquiry_id}`) },
        notif: { type: "quote_received", title: `Quote from ${data.photographer_name ?? "a photographer"}`, body: data.amount ? `₹${Number(data.amount).toLocaleString("en-IN")}` : "Tap to view", link: `/inquiries/${data.inquiry_id}` },
      };
    case "booking_confirmed":
      return {
        subject: "Your booking is confirmed 🎉",
        title: "Your booking is confirmed",
        body: `<p>${hi}</p><p>Great news — your booking${data.event_date ? ` on <strong>${escapeHtml(String(data.event_date))}</strong>` : ""} is confirmed. Payment is safely held in escrow and will be released after the shoot.</p>`,
        cta: { label: "View booking", url: link(`/bookings/${data.booking_id}`) },
        notif: { type: "booking_confirmed", title: "Booking confirmed", body: data.event_date ? `Event on ${data.event_date}` : "Tap to view details", link: `/bookings/${data.booking_id}` },
      };
    case "new_message":
      return {
        subject: `New message from ${data.sender_name ?? "PhotoLancer"}`,
        title: "You have a new message",
        body: `<p>${hi}</p><p><strong>${escapeHtml(String(data.sender_name ?? "Someone"))}</strong> sent you a message:</p><blockquote style="border-left:3px solid #FFB23A;padding:8px 14px;background:#FFF7EC;border-radius:8px;color:#3F2F12;">${escapeHtml(String(data.preview ?? ""))}</blockquote>`,
        cta: { label: "Open conversation", url: link(`/messages/${data.conversation_id}`) },
        notif: { type: "new_message", title: `Message from ${data.sender_name ?? "a member"}`, body: String(data.preview ?? "").slice(0, 120), link: `/messages/${data.conversation_id}` },
      };
    case "review_request":
      return {
        subject: "How was your shoot?",
        title: "Share your experience",
        body: `<p>${hi}</p><p>Your booking with <strong>${escapeHtml(String(data.photographer_name ?? "your photographer"))}</strong> is marked complete. A few honest words from you helps other clients pick well — and helps your photographer keep doing great work.</p>`,
        cta: { label: "Write a review", url: link(`/bookings/${data.booking_id}`) },
        notif: { type: "review_request", title: "How was your shoot?", body: "Share a review for your photographer", link: `/bookings/${data.booking_id}` },
      };
    case "new_application":
      return {
        subject: "A photographer applied to your gig",
        title: "New gig application",
        body: `<p>${hi}</p><p><strong>${escapeHtml(String(data.applicant_name ?? "A photographer"))}</strong> applied to your gig${data.gig_title ? ` <em>"${escapeHtml(String(data.gig_title))}"</em>` : ""}.</p>${data.note ? `<blockquote style="border-left:3px solid #FFB23A;padding:6px 12px;background:#FFF7EC;border-radius:8px;color:#3F2F12;">${escapeHtml(String(data.note))}</blockquote>` : ""}`,
        cta: { label: "Review the application", url: link(`/gigs/${data.gig_id}`) },
        notif: { type: "new_application", title: "New gig application", body: data.gig_title ? `For "${data.gig_title}"` : "Tap to review", link: `/gigs/${data.gig_id}` },
      };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

async function emailForUser(user_id: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(user_id);
    return data.user?.email ?? null;
  } catch { return null; }
}

async function nameForUser(user_id: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("full_name").eq("id", user_id).maybeSingle();
  return data?.full_name ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.event || !Array.isArray(payload.recipients) || payload.recipients.length === 0) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ ok: boolean; channel: string; detail?: string }> = [];

    for (const r of payload.recipients) {
      const email = r.email ?? (r.user_id ? await emailForUser(r.user_id) : null);
      const name = r.name ?? (r.user_id ? await nameForUser(r.user_id) : null);
      const tpl = templateFor(payload.event, name ?? undefined, payload.data ?? {});

      // In-app notification
      if (r.user_id) {
        const { error: nerr } = await admin.from("notifications").insert({
          user_id: r.user_id,
          type: tpl.notif.type,
          title: tpl.notif.title,
          body: tpl.notif.body,
          link: tpl.notif.link,
        });
        results.push({ ok: !nerr, channel: "notification", detail: nerr?.message });
      }

      // Email
      if (email) {
        if (!RESEND_API_KEY) {
          console.log(`[send-email:SIMULATED] to=${email} subject="${tpl.subject}"`);
          results.push({ ok: true, channel: "email", detail: "simulated (no RESEND_API_KEY)" });
        } else {
          const html = shell(tpl.title, tpl.body, tpl.cta?.label, tpl.cta?.url);
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: `${FROM_NAME} <${FROM_EMAIL}>`,
                to: [email],
                subject: tpl.subject,
                html,
              }),
            });
            const ok = res.ok;
            const text = await res.text();
            if (!ok) console.error(`[send-email] resend ${res.status}: ${text}`);
            results.push({ ok, channel: "email", detail: ok ? undefined : `${res.status}: ${text}` });
          } catch (e) {
            console.error("[send-email] fetch error", e);
            results.push({ ok: false, channel: "email", detail: String(e) });
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-email] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
