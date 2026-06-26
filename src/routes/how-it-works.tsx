import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MessageCircle, ShieldCheck, CreditCard, Star, Camera, Briefcase, Users, Calendar, Wallet, Sparkles } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SunButton } from "@/components/sun/SunButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const URL = "https://photolancer.lovable.app/how-it-works";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — PhotoLancer" },
      { name: "description", content: "How PhotoLancer works for clients and photographers — discover, message, book with escrow, get paid safely." },
      { property: "og:title", content: "How it works — PhotoLancer" },
      { property: "og:description", content: "Discover, message, book with escrow, get paid safely on India's photographer marketplace." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: HowItWorksPage,
});

const clientSteps = [
  { icon: Search, title: "Search & shortlist", body: "Filter by city, genre, date, budget and style. Save the photographers you love." },
  { icon: MessageCircle, title: "Message & get a quote", body: "Chat directly. Share your brief, dates and references. Receive transparent quotes." },
  { icon: ShieldCheck, title: "Book with escrow", body: "Pay safely — your money is held in escrow until your shoot is delivered." },
  { icon: Star, title: "Shoot & review", body: "Enjoy your shoot. Funds release after delivery. Leave a verified review to help others." },
];

const photographerSteps = [
  { icon: Camera, title: "Create your free profile", body: "Showcase your best work, set pricing and service cities. Listing is always free." },
  { icon: Users, title: "Get discovered", body: "Appear in search and on category/city pages. Featured listings give you extra visibility." },
  { icon: Calendar, title: "Quote & confirm", body: "Reply to inquiries with custom quotes. When the client books, escrow protects everyone." },
  { icon: Wallet, title: "Deliver & get paid", body: "Deliver the shoot, mark complete, and the escrow releases to your account. No per-lead fees." },
];

function HowItWorksPage() {
  const [tab, setTab] = useState<"client" | "photographer">("client");
  const steps = tab === "client" ? clientSteps : photographerSteps;

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 md:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
            <Sparkles className="h-3.5 w-3.5" /> How it works
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink md:text-5xl">A simple, safe way to book — or get booked.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-[16px] text-ink-muted">PhotoLancer is built on trust: verified photographers, transparent quotes, escrow payments and verified reviews.</p>
        </header>

        <div className="mx-auto mt-8 inline-flex rounded-full border border-line bg-white p-1 shadow-soft">
          {(["client", "photographer"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition ${tab === t ? "bg-gradient-primary text-white shadow-warm" : "text-ink hover:text-sun-700"}`}
            >
              {t === "client" ? "For clients" : "For photographers"}
            </button>
          ))}
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={i} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-white shadow-warm">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-sun-700">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          <Pillar icon={ShieldCheck} title="Community Verified" body="Every featured photographer is verified by our team — identity, portfolio, and reputation." />
          <Pillar icon={CreditCard} title="Escrow payments" body="Funds are held safely until your shoot is delivered. Refunds for genuine disputes." />
          <Pillar icon={Briefcase} title="B2B second-shoots" body="Photographers can also find paid gigs from studios needing second shooters." />
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-extrabold text-ink">Frequently asked</h2>
          <div className="mt-4 rounded-3xl border border-line bg-white p-2 shadow-soft">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1"><AccordionTrigger className="px-4">Is it free to browse and message?</AccordionTrigger><AccordionContent className="px-4">Yes — searching, shortlisting and messaging are completely free for clients.</AccordionContent></AccordionItem>
              <AccordionItem value="q2"><AccordionTrigger className="px-4">When does the photographer get paid?</AccordionTrigger><AccordionContent className="px-4">After the shoot is delivered and marked complete, escrow releases funds to the photographer.</AccordionContent></AccordionItem>
              <AccordionItem value="q3"><AccordionTrigger className="px-4">Do you charge photographers per lead?</AccordionTrigger><AccordionContent className="px-4">Never. Photographers only pay a small commission when they're actually booked — listing is always free.</AccordionContent></AccordionItem>
              <AccordionItem value="q4"><AccordionTrigger className="px-4">What if something goes wrong?</AccordionTrigger><AccordionContent className="px-4">Open a dispute from your booking and our team will mediate. Escrow is only released on agreement.</AccordionContent></AccordionItem>
            </Accordion>
          </div>
        </section>

        <section className="mt-14 grid gap-4 rounded-3xl bg-gradient-warm-soft p-8 md:grid-cols-2 md:p-10">
          <div>
            <h3 className="font-display text-2xl font-extrabold text-ink">Find your photographer</h3>
            <p className="mt-2 text-[15px] text-ink-muted">Browse 12,000+ verified photographers across India.</p>
            <Link to="/search" className="mt-4 inline-block"><SunButton variant="primary">Browse photographers</SunButton></Link>
          </div>
          <div>
            <h3 className="font-display text-2xl font-extrabold text-ink">Are you a photographer?</h3>
            <p className="mt-2 text-[15px] text-ink-muted">Join free and get discovered by clients in your city.</p>
            <Link to="/for-photographers" className="mt-4 inline-block"><SunButton variant="ghost">Learn more</SunButton></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Pillar({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
