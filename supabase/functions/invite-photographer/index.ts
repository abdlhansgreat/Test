// deno-lint-ignore-file no-explicit-any
// Invite (or re-invite) a seeded photographer to claim their PhotoLancer profile.
// Generates an action link via Supabase Admin (invite for unconfirmed users,
// recovery otherwise) and dispatches a warm branded email via send-email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://photolancer.lovable.app";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "PhotoLancer <onboarding@resend.dev>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function inviteHtml(name: string, businessName: string, claimUrl: string) {
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
          <h1 style="margin:0 0 8px 0;font-family:'Bricolage Grotesque',Arial,sans-serif;font-weight:800;font-size:24px;line-height:1.25;color:#2A1E0A;">Hi ${escapeHtml(name)}, your profile is ready ✨</h1>
          <div style="font-size:15px;line-height:1.65;color:#3F2F12;">
            <p>We've set up a PhotoLancer profile for <strong>${escapeHtml(businessName)}</strong> using your India Photographers Club listing. It's waiting for you to claim — about 2 minutes to finish.</p>
            <p style="margin:16px 0 8px 0;"><strong>Why photographers love PhotoLancer:</strong></p>
            <ul style="margin:0;padding-left:20px;">
              <li style="margin-bottom:6px;">💸 <strong>Escrow you can trust</strong> — payments are released to you only after you deliver, so clients commit and you get paid.</li>
              <li style="margin-bottom:6px;">📸 <strong>Paid second-shoot gigs</strong> — pick up extra work from other photographers in your city.</li>
              <li style="margin-bottom:6px;">✅ <strong>Verified Work badges</strong> — real, delivered shoots get a trust badge that ranks you above borrowed portfolios.</li>
            </ul>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="border-radius:999px;background:linear-gradient(135deg,#FFB23A 0%,#FF6A00 100%);">
            <a href="${claimUrl}" style="display:inline-block;padding:14px 28px;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-weight:800;font-size:15px;color:#ffffff;text-decoration:none;border-radius:999px;">Claim my profile</a>
          </td></tr></table>
          <p style="font-size:13px;color:#8a7553;margin:0;">Or paste this link in your browser:<br/><a href="${claimUrl}" style="color:#B5550A;word-break:break-all;">${claimUrl}</a></p>
        </td></tr>
        <tr><td style="padding:18px 32px 28px 32px;border-top:1px solid #F1E6D2;color:#8a7553;font-size:12px;">
          You're receiving this because your studio is listed in the India Photographers Club directory we partnered with.<br/>
          © ${new Date().getFullYear()} PhotoLancer · <a href="${APP_URL}" style="color:#B5550A;text-decoration:none;">photolancer.lovable.app</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[invite-photographer:SIMULATED] to=${to} subject="${subject}"`);
    return { ok: true, simulated: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[invite-photographer] resend ${res.status}: ${text}`);
    return { ok: false, error: `${res.status}: ${text}` };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { photographer_id } = (await req.json()) as { photographer_id?: string };
    if (!photographer_id) {
      return new Response(JSON.stringify({ error: "photographer_id required" }), {
        status: 400, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const { data: photog, error: pErr } = await admin
      .from("photographers")
      .select("id, business_name, profile_id, claimed")
      .eq("id", photographer_id)
      .maybeSingle();
    if (pErr || !photog) {
      return new Response(JSON.stringify({ error: pErr?.message ?? "photographer not found" }), {
        status: 404, headers: { ...cors, "content-type": "application/json" },
      });
    }

    // Look up the auth user (we need their email + confirmation status)
    const { data: userRes, error: uErr } = await admin.auth.admin.getUserById(photog.profile_id);
    if (uErr || !userRes?.user?.email) {
      return new Response(JSON.stringify({ error: uErr?.message ?? "user not found or has no email" }), {
        status: 404, headers: { ...cors, "content-type": "application/json" },
      });
    }
    const user = userRes.user;
    const email = user.email!;

    // Generate the action link: invite for users that haven't logged in / set a password,
    // recovery otherwise.
    const linkType = user.last_sign_in_at ? "recovery" : "invite";
    const { data: linkRes, error: lErr } = await admin.auth.admin.generateLink({
      type: linkType as "invite" | "recovery",
      email,
      options: { redirectTo: `${APP_URL}/claim-account` },
    });
    if (lErr || !linkRes?.properties?.action_link) {
      return new Response(JSON.stringify({ error: lErr?.message ?? "could not generate link" }), {
        status: 500, headers: { ...cors, "content-type": "application/json" },
      });
    }
    const claimUrl = linkRes.properties.action_link;

    // Profile display name (fallback to business name)
    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("id", photog.profile_id).maybeSingle();
    const displayName = (profile?.full_name as string | undefined) ?? photog.business_name;

    const emailResult = await sendEmail(
      email,
      `Claim your PhotoLancer profile, ${displayName}`,
      inviteHtml(displayName, photog.business_name, claimUrl),
    );

    // Mark invite_status
    await admin.from("photographers").update({
      invite_status: "invited",
      invited_at: new Date().toISOString(),
    }).eq("id", photog.id);

    // In-app notification (in case they're already logged in elsewhere)
    await admin.from("notifications").insert({
      user_id: photog.profile_id,
      type: "welcome",
      title: "Your PhotoLancer profile is ready",
      body: "Claim it and finish setting up to go live.",
      link: "/claim-account",
    });

    return new Response(JSON.stringify({ ok: true, email_sent: emailResult.ok, simulated: emailResult.simulated ?? false }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error("[invite-photographer] error", e);
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
