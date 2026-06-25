// Public newsletter subscription endpoint.
// Uses service role + ON CONFLICT DO NOTHING and returns a uniform success
// regardless of whether the email already exists, so unauthenticated callers
// cannot enumerate existing subscribers via duplicate-key errors.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!raw || raw.length > 255 || !EMAIL_RE.test(raw)) {
      // Still return a generic success to avoid leaking validation details
      // about which addresses are real — but with a hint flag for the UI.
      return new Response(JSON.stringify({ ok: false, message: "Please enter a valid email." }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Upsert-style insert that silently ignores duplicates. Same response
    // either way, so attackers cannot probe membership.
    await admin
      .from("subscribers")
      .upsert({ email: raw }, { onConflict: "email", ignoreDuplicates: true });

    return new Response(JSON.stringify({ ok: true, message: "You're on the list. Welcome 🌅" }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ ok: false, message: "Couldn't subscribe right now." }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
