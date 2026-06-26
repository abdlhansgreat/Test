// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FEATURED_PRICE_INR = 999;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { photographer_id } = await req.json();
    if (!photographer_id) {
      return new Response(JSON.stringify({ error: "photographer_id required" }), {
        status: 400, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: photographer, error } = await supabase
      .from("photographers").select("id, business_name").eq("id", photographer_id).single();
    if (error || !photographer) {
      return new Response(JSON.stringify({ error: "photographer not found" }), {
        status: 404, headers: { ...cors, "content-type": "application/json" },
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const amountPaise = FEATURED_PRICE_INR * 100;

    let order: any;
    let simulated = false;

    if (keyId && keySecret) {
      const basic = btoa(`${keyId}:${keySecret}`);
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "content-type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `feat_${photographer_id.slice(0, 8)}_${Date.now()}`,
          notes: { kind: "featured-subscription", photographer_id },
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        return new Response(JSON.stringify({ error: "razorpay error", detail: txt }), {
          status: 502, headers: { ...cors, "content-type": "application/json" },
        });
      }
      order = await r.json();
    } else {
      simulated = true;
      order = {
        id: `sim_order_${crypto.randomUUID()}`,
        amount: amountPaise,
        currency: "INR",
        status: "created",
      };
    }

    return new Response(JSON.stringify({
      order,
      simulated,
      key_id: keyId ?? null,
      photographer_id,
      amount_inr: FEATURED_PRICE_INR,
    }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
