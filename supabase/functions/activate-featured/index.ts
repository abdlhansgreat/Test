// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FEATURED_PERIOD_DAYS = 30;

// TODO: Wire real Razorpay recurring billing webhooks (subscription.charged,
// subscription.halted, subscription.cancelled) to extend / cancel the period.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { photographer_id, gateway_ref } = await req.json();
    if (!photographer_id) {
      return new Response(JSON.stringify({ error: "photographer_id required" }), {
        status: 400, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const periodEnd = new Date(Date.now() + FEATURED_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Upsert: cancel any active rows then insert fresh
    await supabase.from("subscriptions")
      .update({ status: "expired" })
      .eq("photographer_id", photographer_id)
      .eq("status", "active");

    const { data: sub, error: subErr } = await supabase.from("subscriptions").insert({
      photographer_id,
      plan: "featured",
      status: "active",
      gateway: "razorpay",
      gateway_ref: gateway_ref ?? null,
      current_period_end: periodEnd,
    }).select().single();
    if (subErr) throw subErr;

    const { error: pErr } = await supabase.from("photographers")
      .update({ featured: true, featured_until: periodEnd })
      .eq("id", photographer_id);
    if (pErr) throw pErr;

    return new Response(JSON.stringify({ ok: true, subscription: sub }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
