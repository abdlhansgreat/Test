import { ReactNode, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";

export type LegalSection = { id: string; title: string; body: ReactNode };

export function LegalLayout({
  title,
  intro,
  lastUpdated,
  sections,
}: {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 md:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
            Legal
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink md:text-5xl">{title}</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{intro}</p>
          <p className="mt-3 text-sm text-ink-muted">Last updated: <span className="font-semibold text-ink">{lastUpdated}</span></p>
        </header>

        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[14px] text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p>
              <strong>Template pending legal review.</strong> This document is a working template tailored to PhotoLancer and is provided for informational
              purposes only. It is not legal advice and must be reviewed by a qualified lawyer before being relied upon.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-[240px,1fr]">
          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">On this page</div>
              <nav className="mt-3 flex flex-col gap-1.5">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`rounded-lg px-2.5 py-1.5 text-[14px] transition ${
                      active === s.id
                        ? "bg-sun-50 font-semibold text-sun-700"
                        : "text-ink-muted hover:bg-sun-50/60 hover:text-ink"
                    }`}
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="min-w-0">
            <div className="space-y-12 rounded-3xl border border-line bg-white p-6 shadow-soft md:p-10">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-28">
                  <h2 className="font-display text-2xl font-extrabold text-ink">
                    <span className="mr-3 text-sun-600">{String(i + 1).padStart(2, "0")}.</span>
                    {s.title}
                  </h2>
                  <div className="prose-legal mt-4 space-y-4 text-[15.5px] leading-relaxed text-ink-muted [&_a]:text-sun-700 [&_a]:underline [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-ink-muted">
              This is a template document for PhotoLancer and must be reviewed by a qualified lawyer before launch.
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
