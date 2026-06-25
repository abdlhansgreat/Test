// deno-lint-ignore-file no-explicit-any
// Releases escrow when the final delivery milestone is approved (or auto-approved).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking } = await supabase
      .from("bookings").select("*").eq("id", booking_id).single();
    if (!booking) {
      return new Response(JSON.stringify({ error: "booking not found" }), { status: 404, headers: { ...cors, "content-type": "application/json" } });
    }

    // Ensure final milestone is approved
    const { data: finalMs } = await supabase
      .from("delivery_milestones")
      .select("id, status, is_final")
      .eq("booking_id", booking_id)
      .eq("is_final", true)
      .maybeSingle();

    if (!finalMs || finalMs.status !== "approved") {
      return new Response(JSON.stringify({ error: "final milestone not approved yet" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    await supabase.from("bookings").update({
      status: "completed",
      delivery_status: "delivered",
      escrow_status: "released",
    }).eq("id", booking_id);

    await supabase.from("payments").update({ payout_status: "paid" })
      .eq("booking_id", booking_id).eq("status", "paid");

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
