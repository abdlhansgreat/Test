import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ShieldCheck, Wallet, Sparkles, Briefcase, Star, Check, Users } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SunButton } from "@/components/sun/SunButton";
import { FEATURED_PRICE_INR } from "@/lib/billing-config";
import { COMMISSION_RATE } from "@/lib/booking-config";

const URL = "https://photolancer.lovable.app/for-photographers";

export const Route = createFileRoute("/for-photographers")({
  head: () => ({
    meta: [
      { title: "For photographers — Get discovered & booked | PhotoLancer" },
      { name: "description", content: "Join PhotoLancer free. Get discovered by clients, paid safely via escrow, and find paid second-shoot gigs. No per-lead fees." },
      { property: "og:title", content: "For photographers — Get discovered & booked | PhotoLancer" },
      { property: "og:description", content: "Free listing. Escrow payments. No per-lead fees. Join India's photographer marketplace." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ForPhotographersPage,
});

function ForPhotographersPage() {
  const commissionPct = Math.round(COMMISSION_RATE * 100);

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-gradient-warm-soft blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
                <Sparkles className="h-3.5 w-3.5" /> For photographers
              </span>
              <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.05] text-ink md:text-6xl">
                Get discovered. <span className="bg-gradient-primary bg-clip-text text-transparent">Get booked.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted">
                Join India's most trusted photographer marketplace. Free listing, paid via escrow, and a real community of pros backing you up.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/signup"><SunButton variant="primary" size="lg">Join free</SunButton></Link>
                <Link to="/pricing"><SunButton variant="ghost" size="lg">See pricing</SunButton></Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-muted">
                {["Free forever listing", "No per-lead fees", "Escrow-protected payments"].map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-sun-600" />{s}</span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Tile icon={Camera} title="Free profile" body="Showcase your portfolio, set pricing, share your packages." tone="warm" />
              <Tile icon={Users} title="Real demand" body="Active clients across 60+ Indian cities every day." tone="dusk" />
              <Tile icon={ShieldCheck} title="Verified status" body="Earn the Community Verified badge — clients trust it." tone="rose" />
              <Tile icon={Briefcase} title="B2B gigs" body="Pick up paid second-shoot work from studios near you." tone="warm" />
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Why photographers choose PhotoLancer</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Value icon={Wallet} title="Pay only when you get booked" body={`A small ${commissionPct}% commission on confirmed bookings — never per lead.`} />
            <Value icon={ShieldCheck} title="Escrow-protected payments" body="Clients pay upfront into escrow. Funds release once your shoot is delivered." />
            <Value icon={Briefcase} title="Find second-shoot gigs" body="A B2B marketplace built for studios to hire dependable second shooters." />
            <Value icon={Star} title="Community Verified" body="A real credibility signal: identity, portfolio and reputation checked." />
            <Value icon={Users} title="India Photographers Club" body="A network of pros — share work, learn, refer, get referred." />
            <Value icon={Sparkles} title="Featured visibility" body={`Boost your profile to the top of search and homepage for ₹${FEATURED_PRICE_INR.toLocaleString("en-IN")}/month.`} />
          </div>
        </section>

        {/* How payment works */}
        <section className="bg-sun-50/60">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
            <h2 className="font-display text-3xl font-extrabold text-ink md:text-4xl">How you get paid</h2>
            <p className="mt-2 max-w-2xl text-[15px] text-ink-muted">Transparent, safe, and fast. No chasing payments.</p>
            <ol className="mt-8 grid gap-5 md:grid-cols-4">
              {[
                { t: "Client books", b: "Client pays the full amount into escrow at booking." },
                { t: "You shoot", b: "Show up and deliver your best work, on the agreed date." },
                { t: "You deliver", b: "Upload deliverables and mark the booking complete." },
                { t: "Funds release", b: `Escrow releases the amount minus the ${commissionPct}% commission.` },
              ].map((s, i) => (
                <li key={i} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                  <span className="text-[12px] font-extrabold uppercase tracking-wider text-sun-700">Step {i + 1}</span>
                  <h3 className="mt-2 font-display text-lg font-extrabold text-ink">{s.t}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{s.b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing summary */}
        <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-sun-700">Free forever</div>
              <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Listing & inquiries</h3>
              <p className="mt-1 text-ink-muted">Always ₹0. Build your profile, get messages, send quotes.</p>
              <p className="mt-4 text-sm text-ink-muted">Booking commission: <span className="font-bold text-ink">{commissionPct}%</span> on confirmed bookings.</p>
            </div>
            <div className="rounded-3xl border-2 border-sun-300 bg-gradient-warm-soft p-7 shadow-warm">
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-sun-700">Optional</div>
              <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Featured listing</h3>
              <p className="mt-1 text-ink-muted">₹{FEATURED_PRICE_INR.toLocaleString("en-IN")}/month — top of search & homepage.</p>
              <Link to="/pricing" className="mt-4 inline-block"><SunButton variant="primary">See full pricing</SunButton></Link>
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { q: "I picked up 3 bookings in my first month — and a regular second-shoot client.", a: "Ananya, Mumbai" },
              { q: "The escrow took the awkwardness out of payment. Clients trust it.", a: "Rohan, Bengaluru" },
              { q: "Being Community Verified actually moves the needle on inquiries.", a: "Ishaan, Delhi NCR" },
            ].map((t, i) => (
              <figure key={i} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <blockquote className="font-display text-[17px] leading-snug text-ink">"{t.q}"</blockquote>
                <figcaption className="mt-3 text-sm font-bold text-sun-700">{t.a}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-5 pb-20 md:px-8">
          <div className="rounded-3xl bg-gradient-primary p-10 text-center text-white shadow-warm">
            <h3 className="font-display text-3xl font-extrabold md:text-4xl">Ready to get booked?</h3>
            <p className="mx-auto mt-2 max-w-xl text-white/90">It takes 5 minutes to set up your free profile.</p>
            <Link to="/signup" className="mt-6 inline-block">
              <span className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-extrabold text-sun-700 shadow-soft transition hover:opacity-95">Join free →</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Tile({ icon: Icon, title, body, tone }: { icon: any; title: string; body: string; tone: "warm" | "dusk" | "rose" }) {
  const cls = tone === "warm" ? "tile-warm" : tone === "dusk" ? "tile-dusk" : "tile-rose";
  return (
    <div className={`rounded-3xl border border-line p-5 shadow-soft ${cls}`}>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sun-700 shadow-soft"><Icon className="h-5 w-5" /></span>
      <h4 className="mt-3 font-display text-base font-extrabold text-ink">{title}</h4>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

function Value({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-3 font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
