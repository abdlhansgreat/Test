import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, BadgeCheck, Search, MessageSquare, Shield, Star,
  UserPlus, Eye, Wallet, Briefcase, Users, ShieldCheck, CheckCircle2, HandCoins,
  Camera, Heart, Sparkles, Baby, Package, Film, Plane, PartyPopper, Building2,
  MapPin, Quote,
} from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { SearchBar } from "@/components/sun/SearchBar";
import { BentoHero } from "@/components/sun/BentoHero";
import { PhotographerCard } from "@/components/sun/PhotographerCard";
import { SunButton } from "@/components/sun/SunButton";
import { Footer } from "@/components/sun/Footer";
import { CountUp } from "@/components/sun/CountUp";
import { searchPhotographers, toCardProps } from "@/lib/photographer-search";
import { supabase } from "@/integrations/supabase/client";
import { pickStock, cityImage, loadOverrides, getOverride } from "@/lib/stock-images";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhotoLancer — Find a photographer you'll actually love" },
      { name: "description", content: "India's photographer marketplace. Verified photographers across major cities for weddings, fashion, newborn, product and more. Book with escrow protection." },
      { property: "og:title", content: "PhotoLancer — Find a photographer you'll actually love" },
      { property: "og:description", content: "Discover, message and book verified photographers across India — with escrow protection and verified reviews." },
      { property: "og:url", content: "https://photolancer.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://photolancer.lovable.app/" }],
  }),
  component: Home,
});

const categories = [
  { label: "Wedding", slug: "wedding", icon: Heart },
  { label: "Pre-wedding", slug: "pre-wedding", icon: Sparkles },
  { label: "Fashion", slug: "fashion", icon: Camera },
  { label: "Newborn", slug: "newborn", icon: Baby },
  { label: "Maternity", slug: "maternity", icon: Heart },
  { label: "Product", slug: "product", icon: Package },
  { label: "Cinematography", slug: "cinematography", icon: Film },
  { label: "Drone", slug: "drone", icon: Plane },
  { label: "Events", slug: "events", icon: PartyPopper },
];
const DEFAULT_CITY_SLUG = "delhi-ncr";


type Stats = { photographers: number; cities: number; bookings: number; rating: number };
type City = { name: string; slug: string };
type Testimonial = { id: string; rating: number; body: string | null; title: string | null; reviewer: string; photographer: string };

function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [featured, setFeatured] = useState<ReturnType<typeof toCardProps>[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [, setOverridesTick] = useState(0);

  useEffect(() => {
    loadOverrides().then(() => setOverridesTick((t) => t + 1));
    (async () => {
      // STATS
      const [{ count: verified }, { data: distinctCities }, { count: bookingsCount }, { data: ratingRows }] = await Promise.all([
        supabase.from("photographers").select("id", { count: "exact", head: true }).eq("verified", true),
        supabase.from("photographers").select("base_city").not("base_city", "is", null),
        supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["confirmed", "completed"]),
        supabase.from("photographers").select("rating_avg, review_count").gt("review_count", 0),
      ]);
      const cityCount = new Set((distinctCities ?? []).map((r: { base_city: string | null }) => (r.base_city || "").toLowerCase()).filter(Boolean)).size;
      let weighted = 0, totalReviews = 0;
      for (const r of (ratingRows ?? []) as Array<{ rating_avg: number | null; review_count: number | null }>) {
        weighted += Number(r.rating_avg ?? 0) * Number(r.review_count ?? 0);
        totalReviews += Number(r.review_count ?? 0);
      }
      setStats({
        photographers: verified ?? 0,
        cities: cityCount,
        bookings: bookingsCount ?? 0,
        rating: totalReviews > 0 ? Number((weighted / totalReviews).toFixed(1)) : 0,
      });

      // CITIES
      const { data: cityRows } = await supabase
        .from("cities").select("name, slug, popular").order("popular", { ascending: false }).order("name").limit(12);
      setCities((cityRows ?? []).map((c: { name: string; slug: string }) => ({ name: c.name, slug: c.slug })));

      // FEATURED
      try {
        const rows = await searchPhotographers({ sort: "recommended" });
        const now = new Date();
        const feat = rows.filter((r) => r.featured && r.featured_until && new Date(r.featured_until) > now);
        const list = (feat.length > 0 ? feat : rows).slice(0, 6).map(toCardProps);
        setFeatured(list);
      } catch { /* ignore */ }

      // TESTIMONIALS
      const { data: revs } = await supabase
        .from("reviews")
        .select("id, rating, title, body, profiles:reviewer_id(full_name), photographers:photographer_id(business_name)")
        .eq("hidden", false).eq("rating", 5)
        .not("body", "is", null)
        .order("created_at", { ascending: false }).limit(8);
      setTestimonials(((revs ?? []) as unknown as Array<{
        id: string; rating: number; title: string | null; body: string | null;
        profiles: { full_name: string | null } | null;
        photographers: { business_name: string | null } | null;
      }>).map((r) => ({
        id: r.id, rating: r.rating, body: r.body, title: r.title,
        reviewer: r.profiles?.full_name ?? "A happy client",
        photographer: r.photographers?.business_name ?? "PhotoLancer photographer",
      })));
    })();
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      {/* HERO */}
      <section className="bg-hero relative">
        <Navbar />
        <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-8 md:grid-cols-2 md:gap-8 md:px-8 md:pb-32 md:pt-12 lg:gap-16">
          <div className="flex flex-col gap-7 animate-rise">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-sun-300/60 bg-white/80 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider text-ink backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5 text-sun-600" />
              Powered by the India Photographers Club
            </span>
            <h1 className="font-display text-[clamp(38px,5.2vw,68px)] font-extrabold leading-[1.02] text-ink">
              Find a photographer you'll <span className="text-gradient italic">actually love</span>
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-ink-muted md:text-[18px]">
              Verified photographers across India for weddings, fashion, newborn and product. Or list your work and get paid for second-shoots — without the lead-selling nonsense.
            </p>
            <SearchBar />
            <Link to="/signup" className="group inline-flex items-center gap-1.5 text-[15px] font-bold text-sun-700 hover:text-sun-800">
              Are you a photographer? Join free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="flex items-center justify-center md:justify-end">
            <BentoHero />
          </div>
        </div>
      </section>

      {/* LIVE STATS */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4 md:px-8">
          <StatTile icon={<BadgeCheck className="h-5 w-5" />} value={<CountUp to={stats?.photographers ?? 0} />} label="Verified photographers" small={stats !== null && stats.photographers < 10 ? "and growing" : undefined} />
          <StatTile icon={<MapPin className="h-5 w-5" />} value={<CountUp to={stats?.cities ?? 0} />} label="Cities covered" small={stats !== null && stats.cities < 5 ? "expanding fast" : undefined} />
          <StatTile icon={<Camera className="h-5 w-5" />} value={<CountUp to={stats?.bookings ?? 0} />} label="Shoots booked" small={stats !== null && stats.bookings < 25 ? "early & growing" : undefined} />
          <StatTile icon={<Star className="h-5 w-5" />} value={stats && stats.rating > 0 ? <CountUp to={stats.rating} suffix="★" /> : <>—</>} label="Average rating" small={stats && stats.rating === 0 ? "first reviews coming in" : "across verified reviews"} />
        </div>
      </section>

      {/* HOW IT WORKS — TWO TRACKS */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">How PhotoLancer works</div>
          <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight text-ink md:text-[36px]">
            Two simple journeys — <span className="text-gradient italic">one warm community</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <TrackCard
            tag="For clients"
            heading="Book the photographer of your dreams"
            steps={[
              { icon: Search, t: "Search photographers", d: "Filter by city, style, budget and date." },
              { icon: MessageSquare, t: "Compare & message", d: "Chat directly, request quotes, no spam." },
              { icon: Shield, t: "Book with escrow", d: "Your payment is held safely until your event." },
              { icon: Star, t: "Leave a verified review", d: "Only clients with real bookings can review." },
            ]}
            cta={{ label: "Find a photographer", to: "/search" }}
          />
          <TrackCard
            tag="For photographers"
            heading="Get discovered. Get booked. Get paid."
            steps={[
              { icon: UserPlus, t: "Create your profile", d: "Upload your work, set packages and availability." },
              { icon: Eye, t: "Get discovered", d: "Appear in client search and featured slots." },
              { icon: Wallet, t: "Get booked & paid", d: "Payments held in escrow, released after the shoot." },
              { icon: Briefcase, t: "Find second-shoot gigs", d: "Pick up paid work from other studios nearby." },
            ]}
            cta={{ label: "Join free as a photographer", to: "/signup" }}
            warm
          />
        </div>
      </section>

      {/* TRUST PILLARS */}
      <section className="bg-sun-50/60">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Why trust PhotoLancer</div>
            <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight text-ink md:text-[36px]">
              A marketplace built on <span className="text-gradient italic">real trust</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <TrustPillar icon={<Users className="h-5 w-5" />} title="Community verified" body="Every photographer is vetted by the India Photographers Club — portfolio review, references and ID." />
            <TrustPillar icon={<ShieldCheck className="h-5 w-5" />} title="Your money is safe" body="Booking payments are held in escrow and released after your event — never paid upfront." />
            <TrustPillar icon={<CheckCircle2 className="h-5 w-5" />} title="Real verified reviews" body="Only clients with a completed booking can leave a review. No fake stars, ever." />
            <TrustPillar icon={<HandCoins className="h-5 w-5" />} title="No lead-selling, ever" body="Photographers never pay for leads. You only pay when a booking actually happens." />
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Popular categories</div>
            <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">Find your shoot style</h2>
          </div>
          <Link to="/search"><SunButton variant="secondary">Browse all <ArrowRight className="h-4 w-4" /></SunButton></Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c, i) => {
            const Icon = c.icon;
            const fallback = pickStock(c.slug, i);
            const o = getOverride(`category:${c.slug}`);
            const img = o ? { url: o.url, alt: o.alt || fallback.alt } : fallback;
            return (
              <Link
                key={c.slug}
                to="/c/$category/$city"
                params={{ category: c.slug, city: DEFAULT_CITY_SLUG }}
                className="group relative flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-3xl border border-sun-200/60 p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-warm"
              >
                <img src={img.url} alt={img.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-sun-700 shadow-soft">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="relative">
                  <div className="font-display text-lg font-extrabold text-white drop-shadow">{c.label}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-sun-200">
                    Browse <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* POPULAR CITIES */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Popular cities</div>
              <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">Photographers near you</h2>
            </div>
          </div>
          {cities.length === 0 ? (
            <EmptyTile icon={<Building2 className="h-5 w-5" />} msg="Cities are loading — check back in a moment." />
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {cities.map((c) => {
                const fallback = cityImage(c.slug);
                const o = getOverride(`city:${c.slug}`);
                const img = o ? { url: o.url, alt: o.alt || fallback.alt } : fallback;
                return (
                  <Link
                    key={c.slug}
                    to="/c/$category/$city"
                    params={{ category: "wedding", city: c.slug }}
                    className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-line shadow-soft transition hover:-translate-y-1 hover:shadow-warm"
                  >
                    <img src={img.url} alt={img.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="relative p-4">
                      <div className="inline-flex items-center gap-1.5 text-[15px] font-bold text-white drop-shadow">
                        <MapPin className="h-4 w-4 text-sun-300" /> {c.name}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-sun-200">
                        Browse <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>



      {/* FEATURED PHOTOGRAPHERS */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Featured photographers</div>
            <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">Loved by our community</h2>
          </div>
          <Link to="/search"><SunButton variant="secondary">See all <ArrowRight className="h-4 w-4" /></SunButton></Link>
        </div>
        {featured.length === 0 ? (
          <EmptyTile icon={<Camera className="h-5 w-5" />} msg="No featured photographers yet — be the first to shine." />
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 6).map((p, i) => {
              const key = (p as { photographerId?: string }).photographerId ?? String(i);
              return <PhotographerCard key={key} {...(p as React.ComponentProps<typeof PhotographerCard>)} />;
            })}
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-sun-50/60">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Real stories</div>
            <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight text-ink md:text-[36px]">
              Verified reviews from <span className="text-gradient italic">real bookings</span>
            </h2>
          </div>
          {testimonials.length === 0 ? (
            <div className="mt-10"><EmptyTile icon={<Quote className="h-5 w-5" />} msg="The first verified reviews will appear here as bookings complete." /></div>
          ) : (
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((t) => (
                <figure key={t.id} className="rounded-3xl border border-sun-200/60 bg-white p-6 shadow-soft">
                  <div className="flex items-center gap-1 text-sun-600">
                    {Array.from({ length: t.rating }).map((_, i) => (<Star key={i} className="h-4 w-4 fill-current" />))}
                  </div>
                  {t.title && <div className="mt-3 font-display text-base font-extrabold text-ink">{t.title}</div>}
                  <blockquote className="mt-2 text-[15px] leading-relaxed text-ink/85">"{t.body}"</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3 border-t border-line pt-4 text-[13px]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary font-bold text-white">
                      {t.reviewer.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{t.reviewer}</span>
                      <span className="block truncate text-ink-muted">shot by {t.photographer}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* DUAL CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <CtaBand
            tag="For clients"
            title="Find your photographer"
            body="Browse verified photographers across India and book your dream shoot with escrow protection."
            cta={{ label: "Start exploring", to: "/search" }}
            tone="warm"
          />
          <CtaBand
            tag="For photographers"
            title="Join free & get discovered"
            body="Build a profile, accept bookings and find paid second-shoots — no lead fees, only a small commission on confirmed jobs."
            cta={{ label: "Create your studio", to: "/signup" }}
            tone="dusk"
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatTile({ icon, value, label, small }: { icon: React.ReactNode; value: React.ReactNode; label: string; small?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-50 text-sun-700">{icon}</div>
      <div className="min-w-0">
        <div className="font-display text-3xl font-extrabold text-ink md:text-4xl">{value}</div>
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        {small && <div className="text-[11px] font-medium text-sun-700">{small}</div>}
      </div>
    </div>
  );
}

function TrackCard({
  tag, heading, steps, cta, warm,
}: {
  tag: string; heading: string;
  steps: { icon: React.ComponentType<{ className?: string }>; t: string; d: string }[];
  cta: { label: string; to: string }; warm?: boolean;
}) {
  return (
    <div className={`rounded-[32px] border border-sun-200/60 p-8 shadow-soft md:p-10 ${warm ? "bg-gradient-to-br from-sun-50 to-white" : "bg-white"}`}>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sun-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700">{tag}</span>
      <h3 className="mt-4 font-display text-2xl font-extrabold text-ink md:text-[28px]">{heading}</h3>
      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.t} className="flex items-start gap-4">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-soft">
                <Icon className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white text-[10px] font-extrabold text-sun-700 shadow-soft">{i + 1}</span>
              </span>
              <div className="min-w-0">
                <div className="font-display text-base font-extrabold text-ink">{s.t}</div>
                <div className="text-[14px] leading-relaxed text-ink-muted">{s.d}</div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-7">
        <Link to={cta.to}><SunButton>{cta.label} <ArrowRight className="h-4 w-4" /></SunButton></Link>
      </div>
    </div>
  );
}

function TrustPillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-50 text-sun-700">{icon}</div>
      <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

function EmptyTile({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return (
    <div className="mt-10 flex items-center justify-center gap-3 rounded-3xl border border-dashed border-sun-300/60 bg-white px-6 py-12 text-center text-ink-muted">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-50 text-sun-700">{icon}</span>
      <span>{msg}</span>
    </div>
  );
}

function CtaBand({
  tag, title, body, cta, tone,
}: { tag: string; title: string; body: string; cta: { label: string; to: string }; tone: "warm" | "dusk" }) {
  const bg = tone === "warm" ? "bg-gradient-to-br from-sun-100 via-sun-50 to-white" : "bg-gradient-to-br from-white via-sun-50 to-sun-100";
  return (
    <div className={`relative overflow-hidden rounded-[32px] border border-sun-200/60 p-8 shadow-soft md:p-12 ${bg}`}>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700 backdrop-blur">{tag}</span>
      <h3 className="mt-4 font-display text-[clamp(24px,3vw,36px)] font-extrabold leading-tight text-ink">{title}</h3>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/80">{body}</p>
      <div className="mt-6">
        <Link to={cta.to}><SunButton size="lg">{cta.label} <ArrowRight className="h-4 w-4" /></SunButton></Link>
      </div>
    </div>
  );
}
