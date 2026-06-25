import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Sparkles, ShieldCheck, Wallet } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { FEATURED_PRICE_INR, FEATURED_BENEFITS, FREE_BENEFITS } from "@/lib/billing-config";
import { COMMISSION_RATE } from "@/lib/booking-config";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const URL = "https://photolancer.lovable.app/pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Free listing, fair commission | PhotoLancer" },
      { name: "description", content: "Transparent pricing for photographers: free listing forever, a small commission only on confirmed bookings, optional Featured plan. No per-lead fees." },
      { property: "og:title", content: "Pricing — PhotoLancer" },
      { property: "og:description", content: "Free listing. Pay only when booked. No per-lead fees." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [commission, setCommission] = useState(COMMISSION_RATE);
  const [featuredPrice, setFeaturedPrice] = useState(FEATURED_PRICE_INR);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_pricing");
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return;
      const cr = Number(row.commission_rate);
      if (Number.isFinite(cr)) setCommission(cr > 1 ? cr / 100 : cr);
      const fp = Number(row.featured_price);
      if (Number.isFinite(fp)) setFeaturedPrice(fp);
    })();
  }, []);

  const pct = Math.round(commission * 100);

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 md:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
            <Sparkles className="h-3.5 w-3.5" /> Pricing
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink md:text-5xl">No per-lead fees. Ever.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[16px] text-ink-muted">
            Listing is free forever. A small commission applies only when you're actually booked. Featured is optional, for extra visibility.
          </p>
        </header>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-sun-700">Free forever</div>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Free listing</h2>
            <p className="mt-1 text-ink-muted">Everything you need to get found and booked.</p>
            <div className="mt-5 text-4xl font-display font-extrabold text-ink">₹0<span className="text-base font-bold text-ink-muted">/month</span></div>
            <ul className="mt-5 space-y-2.5">
              {FREE_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[15px] text-ink"><Check className="mt-0.5 h-4 w-4 text-sun-600" />{b}</li>
              ))}
            </ul>
            <Link to="/signup" className="mt-6 inline-block"><SunButton variant="ghost">Create free profile</SunButton></Link>
          </div>

          <div className="rounded-3xl border-2 border-sun-300 bg-gradient-warm-soft p-7 shadow-warm">
            <div className="text-[12px] font-extrabold uppercase tracking-wider text-sun-700">Most visibility</div>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Featured</h2>
            <p className="mt-1 text-ink-muted">Top placement in search and on the homepage.</p>
            <div className="mt-5 text-4xl font-display font-extrabold text-ink">₹{featuredPrice.toLocaleString("en-IN")}<span className="text-base font-bold text-ink-muted">/month</span></div>
            <ul className="mt-5 space-y-2.5">
              {FEATURED_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[15px] text-ink"><Check className="mt-0.5 h-4 w-4 text-sun-700" />{b}</li>
              ))}
            </ul>
            <Link to="/studio/billing" className="mt-6 inline-block"><SunButton variant="primary">Upgrade to Featured</SunButton></Link>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-line bg-white p-7 shadow-soft">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-white shadow-warm"><Wallet className="h-6 w-6" /></span>
            <div className="flex-1">
              <h3 className="font-display text-xl font-extrabold text-ink">Booking commission: {pct}%</h3>
              <p className="text-[14.5px] text-ink-muted">Charged only on confirmed bookings, after the shoot is delivered. No upfront, no per-lead, no hidden fees.</p>
            </div>
            <Link to="/for-photographers"><SunButton variant="ghost" size="sm">How payments work</SunButton></Link>
          </div>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <Trust icon={ShieldCheck} title="Escrow built-in" body="Clients pay into escrow; you're paid after delivery." />
          <Trust icon={Check} title="Cancel anytime" body="No long contracts on Featured. Cancel from your billing page." />
          <Trust icon={Sparkles} title="Same for everyone" body="No special deals, no kickbacks — the marketplace stays fair." />
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold text-ink">Payments & payouts FAQ</h2>
          <div className="mt-4 rounded-3xl border border-line bg-white p-2 shadow-soft">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1"><AccordionTrigger className="px-4">When do I get paid for a booking?</AccordionTrigger><AccordionContent className="px-4">Once you deliver the shoot and the booking is marked complete, escrow releases the amount (minus commission) to your account.</AccordionContent></AccordionItem>
              <AccordionItem value="q2"><AccordionTrigger className="px-4">What payment methods do clients use?</AccordionTrigger><AccordionContent className="px-4">UPI, cards, netbanking and wallets via our payment gateway. Funds are held in escrow until delivery.</AccordionContent></AccordionItem>
              <AccordionItem value="q3"><AccordionTrigger className="px-4">Are there any per-lead or messaging fees?</AccordionTrigger><AccordionContent className="px-4">No. Listing, inquiries, messaging and quoting are always free.</AccordionContent></AccordionItem>
              <AccordionItem value="q4"><AccordionTrigger className="px-4">What happens on cancellations?</AccordionTrigger><AccordionContent className="px-4">Cancellations follow each photographer's stated terms; refunds go back to the client and any commission is reversed.</AccordionContent></AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Trust({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-3 font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
