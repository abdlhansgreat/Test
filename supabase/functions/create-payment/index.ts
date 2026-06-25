// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_COMMISSION_RATE = 0.10;

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

    const { data: booking, error: bErr } = await supabase
      .from("bookings").select("*").eq("id", booking_id).single();
    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: "booking not found" }), { status: 404, headers: { ...cors, "content-type": "application/json" } });
    }

    const amount = Number(booking.amount);
    // Read live commission rate from platform_settings, fall back to constant.
    const { data: settings } = await supabase.from("platform_settings").select("commission_rate").limit(1).maybeSingle();
    const rate = settings?.commission_rate != null ? Number(settings.commission_rate) : DEFAULT_COMMISSION_RATE;
    const commission = Math.round(amount * rate);

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    let order: any;
    let simulated = false;

    if (keyId && keySecret) {
      // Real Razorpay order
      const auth = btoa(`${keyId}:${keySecret}`);
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}`, "content-type": "application/json" },
        body: JSON.stringify({
          amount: amount * 100, // paise
          currency: "INR",
          receipt: `bk_${booking_id.slice(0, 30)}`,
          notes: { booking_id, commission_amount: commission },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return new Response(JSON.stringify({ error: "razorpay order failed", details: txt }), { status: 502, headers: { ...cors, "content-type": "application/json" } });
      }
      order = await res.json();
    } else {
      simulated = true;
      order = {
        id: `order_sim_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`,
        amount: amount * 100,
        currency: "INR",
        status: "created",
      };
    }

    // Upsert a payment row
    const { data: pay, error: pErr } = await supabase
      .from("payments")
      .insert({
        booking_id,
        amount,
        commission_amount: commission,
        gateway: simulated ? "simulated" : "razorpay",
        gateway_ref: order.id,
        status: "created",
      })
      .select()
      .single();
    if (pErr) {
      return new Response(JSON.stringify({ error: pErr.message }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({
      order,
      simulated,
      key_id: keyId ?? null,
      payment_id: pay.id,
      amount,
      commission,
    }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
