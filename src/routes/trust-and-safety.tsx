import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, BadgeCheck, Lock, Star, FileText, MessageCircle, Sparkles } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SunButton } from "@/components/sun/SunButton";

const URL = "https://photolancer.lovable.app/trust-and-safety";

export const Route = createFileRoute("/trust-and-safety")({
  head: () => ({
    meta: [
      { title: "Trust & Safety — PhotoLancer" },
      { name: "description", content: "How PhotoLancer keeps clients and photographers safe: Community Verification, escrow payments, verified reviews, digital contracts and dispute resolution." },
      { property: "og:title", content: "Trust & Safety — PhotoLancer" },
      { property: "og:description", content: "Verification, escrow, verified reviews, digital contracts, dispute resolution." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-6 md:px-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
            <Sparkles className="h-3.5 w-3.5" /> Trust & Safety
          </span>
          <h1 className="mt-4 font-display text-5xl font-extrabold text-ink md:text-6xl">Built so you can hire — and get hired — with confidence.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-muted">
            Every part of PhotoLancer is designed around one idea: protecting both sides of the booking.
          </p>
        </header>

        <section className="mt-12 space-y-6">
          <Pillar icon={BadgeCheck} title="Community Verification" body="Featured photographers earn the Community Verified badge after we check their identity, portfolio and reputation. It's a credibility signal — not a paid badge." />
          <Pillar icon={Lock} title="Escrow protection on every booking" body="Clients pay into escrow at booking; funds are released to the photographer only after the shoot is delivered. Refunds follow the photographer's stated cancellation terms." />
          <Pillar icon={Star} title="Verified reviews tied to real bookings" body="Only clients with a confirmed, completed booking can leave a review. No fake five-stars, no anonymous drive-bys." />
          <Pillar icon={FileText} title="Digital contracts for B2B gigs" body="Every second-shoot hire generates a signed digital contract — clear copyright, usage and payment terms for both sides." />
          <Pillar icon={MessageCircle} title="In-app messaging that stays in-app" body="Conversations live on PhotoLancer so we can help if anything goes wrong. Don't move payments off-platform — it voids escrow protection." />
          <Pillar icon={ShieldCheck} title="Disputes & resolution" body="Open a dispute from your booking. Funds stay in escrow while our team listens to both sides and helps reach a fair outcome." />
        </section>

        <section className="mt-14 rounded-3xl bg-gradient-warm-soft p-10 text-center">
          <h2 className="font-display text-3xl font-extrabold text-ink">Safety is a shared responsibility</h2>
          <p className="mx-auto mt-2 max-w-2xl text-[15.5px] text-ink-muted">If something doesn't feel right, tell us. We read every report and take action.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/contact"><SunButton variant="primary">Contact support</SunButton></Link>
            <Link to="/faq"><SunButton variant="ghost">Read the FAQ</SunButton></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Pillar({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="flex gap-5 rounded-3xl border border-line bg-white p-6 shadow-soft md:p-7">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-white shadow-warm"><Icon className="h-6 w-6" /></span>
      <div>
        <h3 className="font-display text-xl font-extrabold text-ink">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{body}</p>
      </div>
    </div>
  );
}
