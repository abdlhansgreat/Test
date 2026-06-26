import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const URL = "https://photolancer.lovable.app/faq";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — PhotoLancer" },
      { name: "description", content: "Frequently asked questions about booking photographers, payments, escrow, verification and trust on PhotoLancer." },
      { property: "og:title", content: "FAQ — PhotoLancer" },
      { property: "og:description", content: "Answers about booking, payments, escrow, verification and trust." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: FaqPage,
});

type QA = { q: string; a: string };
type Section = { title: string; items: QA[] };

const sections: Section[] = [
  {
    title: "For clients",
    items: [
      { q: "Is it free to browse and message photographers?", a: "Yes — searching, shortlisting, messaging and getting quotes are completely free for clients." },
      { q: "How do I shortlist photographers?", a: "Tap the heart on any card to save them. Your saved photographers live at /saved." },
      { q: "Can I see real reviews?", a: "Yes. Reviews on PhotoLancer are verified — only clients who actually booked can leave one." },
      { q: "How do I book?", a: "Open a photographer's profile, send an inquiry, agree on a quote and pay securely. Funds are held in escrow until your shoot is delivered." },
    ],
  },
  {
    title: "For photographers",
    items: [
      { q: "How much does it cost to list?", a: "Listing is free forever. You only pay a small commission on confirmed bookings — never per lead." },
      { q: "What is Featured?", a: "An optional monthly plan that places you at the top of search and on the homepage for extra visibility." },
      { q: "Can I find second-shoot work?", a: "Yes — browse /gigs and apply with your day rate. Studios hire through our B2B marketplace." },
      { q: "How does verification work?", a: "Submit your ID and portfolio for review. Verified photographers get a badge that clients trust." },
    ],
  },
  {
    title: "Payments & escrow",
    items: [
      { q: "Where does my money go?", a: "Into a secure escrow account. The photographer is paid only after you confirm the shoot is delivered." },
      { q: "What payment methods are supported?", a: "UPI, cards, netbanking and wallets via our payment gateway." },
      { q: "When are photographers paid out?", a: "After delivery and completion, funds release to the photographer minus the platform commission." },
      { q: "What if my shoot is cancelled?", a: "Refunds follow the photographer's stated cancellation terms. Our team mediates disputes." },
    ],
  },
  {
    title: "Verification & trust",
    items: [
      { q: "What does Community Verified mean?", a: "Verified photographers have passed identity, portfolio and reputation checks by our team." },
      { q: "Are reviews real?", a: "Yes. Only customers with a confirmed booking can review, so reviews reflect real experiences." },
      { q: "How are disputes handled?", a: "Open a dispute from your booking. Funds remain in escrow while our team mediates between both sides." },
      { q: "Are B2B gigs covered by a contract?", a: "Yes — every gig hire generates a digital contract with copyright, usage and payment terms." },
    ],
  },
];

function FaqPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((it) => (it.q + " " + it.a).toLowerCase().includes(t)) }))
      .filter((s) => s.items.length > 0);
  }, [q]);

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-6 md:px-8">
        <header className="text-center">
          <h1 className="font-display text-4xl font-extrabold text-ink md:text-5xl">Help & FAQ</h1>
          <p className="mx-auto mt-3 max-w-xl text-[16px] text-ink-muted">Answers to the questions clients and photographers ask most.</p>
          <div className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 shadow-soft">
            <Search className="h-4 w-4 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions…"
              className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
        </header>

        <div className="mt-10 space-y-8">
          {filtered.length === 0 && (
            <p className="rounded-3xl border border-line bg-white p-8 text-center text-ink-muted shadow-soft">No matching questions. Try different keywords.</p>
          )}
          {filtered.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-xl font-extrabold text-ink">{s.title}</h2>
              <div className="mt-3 rounded-3xl border border-line bg-white p-2 shadow-soft">
                <Accordion type="single" collapsible className="w-full">
                  {s.items.map((it, i) => (
                    <AccordionItem key={i} value={`${s.title}-${i}`}>
                      <AccordionTrigger className="px-4 text-left">{it.q}</AccordionTrigger>
                      <AccordionContent className="px-4 text-[15px] leading-relaxed text-ink-muted">{it.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
