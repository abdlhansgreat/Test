import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Camera, ShieldCheck, Sparkles, Briefcase } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SunButton } from "@/components/sun/SunButton";

const URL = "https://photolancer.lovable.app/about";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About PhotoLancer — Built by the India Photographers Club" },
      { name: "description", content: "PhotoLancer's mission, story and vision: a trusted marketplace built by photographers, for photographers and the clients who hire them." },
      { property: "og:title", content: "About PhotoLancer" },
      { property: "og:description", content: "A trusted marketplace built by the India Photographers Club." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-6 md:px-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
            <Sparkles className="h-3.5 w-3.5" /> Our story
          </span>
          <h1 className="mt-4 font-display text-5xl font-extrabold text-ink md:text-6xl">Photography deserves a better home.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-muted">
            PhotoLancer is India's photographer marketplace and network — built by working photographers, for the clients who hire them and the pros who shoot them.
          </p>
        </header>

        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-white p-8 shadow-soft">
            <h2 className="font-display text-2xl font-extrabold text-ink">Our mission</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">
              To make hiring a photographer in India simple, transparent and trustworthy — and to give photographers a fairer, kinder place to grow a real career.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-white p-8 shadow-soft">
            <h2 className="font-display text-2xl font-extrabold text-ink">Where it started</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">
              PhotoLancer grew out of the <strong>India Photographers Club</strong> — a community of professionals tired of lead-spam marketplaces and clients tired of guessing who's real. We built the marketplace we wished existed.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-3xl font-extrabold text-ink">What makes us different</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Diff icon={ShieldCheck} title="Trust by design" body="Community Verified profiles. Identity, portfolio and reputation checks before the badge." />
            <Diff icon={Users} title="Real reviews" body="Only clients with a confirmed booking can review. No drive-by ratings." />
            <Diff icon={Camera} title="Escrow protection" body="Clients pay upfront into escrow; photographers paid after delivery. Safe both ways." />
            <Diff icon={Briefcase} title="B2B second-shoots" body="A dedicated marketplace where studios hire dependable second shooters by the day." />
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-gradient-warm-soft p-10">
          <h2 className="font-display text-3xl font-extrabold text-ink">Our vision</h2>
          <p className="mt-3 max-w-3xl text-[16px] leading-relaxed text-ink-muted">
            A future where every Indian wedding, brand shoot, newborn session and indie film starts here — where clients find someone they actually love working with, and photographers earn what their work is worth, safely.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/search"><SunButton variant="primary">Browse photographers</SunButton></Link>
            <Link to="/for-photographers"><SunButton variant="ghost">Join as a photographer</SunButton></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Diff({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Icon className="h-5 w-5" /></span>
      <h3 className="mt-3 font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
