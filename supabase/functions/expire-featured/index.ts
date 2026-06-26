// deno-lint-ignore-file no-explicit-any
// Cleanup routine: flips featured = false on photographers whose featured_until
// has passed, and marks the matching subscriptions expired. Hook this up to
// pg_cron or any scheduler.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const nowIso = new Date().toISOString();

    const { data: expired, error: e1 } = await supabase
      .from("photographers")
      .update({ featured: false })
      .lt("featured_until", nowIso)
      .eq("featured", true)
      .select("id");
    if (e1) throw e1;

    const { error: e2 } = await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .lt("current_period_end", nowIso)
      .eq("status", "active");
    if (e2) throw e2;

    return new Response(JSON.stringify({ ok: true, expired_count: expired?.length ?? 0 }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
