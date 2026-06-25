import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, CreditCard, X, Loader2 } from "lucide-react";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import {
  FEATURED_PRICE_INR, FEATURED_BENEFITS, FREE_BENEFITS,
} from "@/lib/billing-config";
import { inr } from "@/lib/booking-config";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studio/billing")({
  head: () => ({ meta: [{ title: "Billing — PhotoLancer Studio" }] }),
  component: BillingPage,
});

type SubRow = {
  id: string; plan: string; status: string;
  current_period_end: string | null; gateway_ref: string | null;
};

function BillingPage() {
  const [photographerId, setPhotographerId] = useState<string | null>(null);
  const [sub, setSub] = useState<SubRow | null>(null);
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: photog } = await supabase
      .from("photographers")
      .select("id, featured, featured_until")
      .eq("profile_id", u.user.id).maybeSingle();
    if (!photog) { setLoading(false); return; }
    setPhotographerId(photog.id);
    setFeaturedUntil(photog.featured_until);
    const { data: s } = await supabase
      .from("subscriptions")
      .select("id, plan, status, current_period_end, gateway_ref")
      .eq("photographer_id", photog.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setSub(s ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isFeatured = !!(featuredUntil && new Date(featuredUntil) > new Date());

  const upgrade = async () => {
    if (!photographerId) return;
    setBusy(true);
    try {
      const { data: co, error: e1 } = await supabase.functions.invoke("featured-checkout", {
        body: { photographer_id: photographerId },
      });
      if (e1) throw e1;
      // In a real Razorpay flow, open Checkout SDK here with co.order + co.key_id,
      // then call activate-featured from the success handler.
      const { error: e2 } = await supabase.functions.invoke("activate-featured", {
        body: { photographer_id: photographerId, gateway_ref: co?.order?.id ?? null },
      });
      if (e2) throw e2;
      toast.success(co?.simulated ? "Featured activated (simulated)" : "Featured activated");
      await load();
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't start checkout");
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!sub) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
      if (error) throw error;
      toast.success("Subscription cancelled. You'll stay featured until renewal date.");
      await load();
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't cancel");
    } finally { setBusy(false); }
  };

  return (
    <StudioLayout title="Billing & plan">
      {loading ? (
        <div className="flex items-center justify-center p-16 text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* FREE */}
          <article className={`rounded-3xl border bg-white p-7 shadow-soft ${!isFeatured ? "border-sun-300 ring-2 ring-sun-200" : "border-line"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">Free</div>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">Standard listing</h2>
              </div>
              {!isFeatured && <span className="rounded-full bg-sun-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sun-700">Current</span>}
            </div>
            <div className="mt-4 font-display text-4xl font-extrabold text-ink">₹0<span className="text-base font-semibold text-ink-muted">/mo</span></div>
            <ul className="mt-6 space-y-2.5 text-[15px] text-ink">
              {FREE_BENEFITS.map((b) => (
                <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{b}</li>
              ))}
            </ul>
            <p className="mt-6 text-[12px] text-ink-muted">
              We charge a {Math.round(0.10 * 100)}% booking commission only when you get paid — never per lead.
            </p>
          </article>

          {/* FEATURED */}
          <article className={`relative overflow-hidden rounded-3xl border bg-white p-7 shadow-soft ${isFeatured ? "border-sun-300 ring-2 ring-sun-200" : "border-line"}`}>
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-primary opacity-20" />
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sun-700">
                  <Sparkles className="h-3.5 w-3.5" /> Featured
                </div>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">Boost your reach</h2>
              </div>
              {isFeatured && <span className="rounded-full bg-gradient-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Active</span>}
            </div>
            <div className="mt-4 font-display text-4xl font-extrabold text-ink">
              {inr(FEATURED_PRICE_INR)}<span className="text-base font-semibold text-ink-muted">/mo</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-[15px] text-ink">
              {FEATURED_BENEFITS.map((b) => (
                <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sun-600" />{b}</li>
              ))}
            </ul>

            {isFeatured ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-sun-50 p-4 text-sm text-ink">
                  <div className="font-semibold">Renews on {featuredUntil ? new Date(featuredUntil).toLocaleDateString() : "—"}</div>
                  {sub?.status === "cancelled" && (
                    <div className="mt-1 text-ink-muted">Cancelled — you'll stay featured until that date.</div>
                  )}
                </div>
                {sub?.status === "active" && (
                  <SunButton variant="secondary" onClick={cancel} disabled={busy} className="w-full">
                    <X className="h-4 w-4" /> Cancel subscription
                  </SunButton>
                )}
              </div>
            ) : (
              <SunButton onClick={upgrade} disabled={busy} className="mt-6 w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Upgrade to Featured
              </SunButton>
            )}
          </article>
        </div>
      )}

      <p className="mt-8 text-center text-[12px] text-ink-muted">
        Bank account setup and payout statements coming soon. Commission rate becomes admin-configurable in the next phase.
      </p>
    </StudioLayout>
  );
}
