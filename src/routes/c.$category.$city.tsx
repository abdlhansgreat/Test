import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { PhotographerCard } from "@/components/sun/PhotographerCard";
import { supabase } from "@/integrations/supabase/client";
import {
  searchPhotographers,
  toCardProps,
  type PhotographerResult,
} from "@/lib/photographer-search";
import { POPULAR_CITIES } from "@/lib/cities";
import { useSavedSet } from "@/hooks/use-saved-set";

function slugToTitle(s: string) {
  return s
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export const Route = createFileRoute("/c/$category/$city")({
  loader: async ({ params }) => {
    const { data: genre } = await supabase
      .from("genres")
      .select("name, slug")
      .eq("slug", params.category)
      .maybeSingle();
    if (!genre) throw notFound();
    const cityName = slugToTitle(params.city.replace(/-/g, " "));
    return { genre, cityName };
  },
  head: ({ params, loaderData }) => {
    const title = loaderData
      ? `${loaderData.genre.name} photographers in ${loaderData.cityName} — PhotoLancer`
      : "PhotoLancer";
    const desc = loaderData
      ? `Hire verified ${loaderData.genre.name.toLowerCase()} photographers in ${loaderData.cityName}. Compare portfolios, packages and pricing on PhotoLancer.`
      : "";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: `https://photolancer.lovable.app/c/${params.category}/${params.city}` },
      ],
      links: [{ rel: "canonical", href: `https://photolancer.lovable.app/c/${params.category}/${params.city}` }],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink">Category not found</h1>
        <Link to="/" className="mt-4 inline-block text-sun-700 underline">Back home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-ink">{error.message}</div>
  ),
  component: CategoryCityPage,
});

function CategoryCityPage() {
  const { genre, cityName } = Route.useLoaderData();
  const { category, city } = Route.useParams();
  const [results, setResults] = useState<PhotographerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherGenres, setOtherGenres] = useState<{ name: string; slug: string }[]>([]);
  const savedSet = useSavedSet();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchPhotographers({ genres: [genre.slug], city: cityName, sort: "recommended" })
      .then((r) => !cancelled && setResults(r))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
  }, [genre.slug, cityName]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("genres").select("name, slug").neq("slug", genre.slug).limit(8);
      setOtherGenres((data as any) ?? []);
    })();
  }, [genre.slug]);

  const otherCities = POPULAR_CITIES.filter(
    (c) => c.toLowerCase() !== cityName.toLowerCase(),
  ).slice(0, 8);

  const faqs = buildCategoryFaqs(genre.name, cityName);
  const longIntro = buildLongIntro(genre.name, cityName);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <section className="bg-hero">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <nav className="mb-4 text-sm font-semibold text-ink-muted">
            <Link to="/" className="hover:text-sun-700">Home</Link> ·{" "}
            <Link to="/search" className="hover:text-sun-700">Search</Link> ·{" "}
            <span className="text-ink">{genre.name}</span>
          </nav>
          <h1 className="font-display text-[clamp(34px,4.5vw,56px)] font-extrabold leading-[1.05] text-ink">
            {genre.name} photographers in <span className="text-gradient">{cityName}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-muted">
            Discover verified {genre.name.toLowerCase()} photographers across {cityName}. Browse portfolios,
            compare packages, and book the right photographer for your event — all on PhotoLancer, India's
            photographer marketplace backed by the India Photographers Club.
          </p>
          <div className="mt-6">
            <Link
              to="/search"
              search={{ city: cityName, genres: genre.slug } as any}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft"
            >
              Open in full search
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[380px] animate-pulse rounded-3xl border border-line bg-white" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white p-16 text-center">
            <div className="font-display text-2xl font-extrabold text-ink">
              No {genre.name.toLowerCase()} photographers in {cityName} yet
            </div>
            <p className="mt-2 text-ink-muted">Check back soon — or browse all photographers.</p>
            <Link
              to="/search"
              className="mt-5 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              See all photographers
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <PhotographerCard key={r.id} {...toCardProps(r)} initialSaved={savedSet.has(r.id)} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1fr,320px] md:px-8">
          <article className="prose-legal max-w-none text-[15.5px] leading-[1.8] text-ink/85 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-ink [&_h2]:mt-8 [&_p]:mt-4">
            <h2>About {genre.name.toLowerCase()} photography in {cityName}</h2>
            {longIntro.map((para, i) => <p key={i}>{para}</p>)}

            <h2 className="!mt-12">Frequently asked questions</h2>
            <div className="mt-4 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-line bg-sun-50/40 p-4 open:bg-sun-50">
                  <summary className="cursor-pointer list-none font-display text-[16px] font-extrabold text-ink">
                    <span className="text-sun-700">Q.</span> {f.q}
                  </summary>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </article>

          <aside className="space-y-6 md:sticky md:top-24 md:self-start">
            <div className="rounded-3xl border border-line bg-sun-50/60 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Related genres</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {otherGenres.map((g) => (
                  <Link
                    key={g.slug}
                    to="/c/$category/$city"
                    params={{ category: g.slug, city }}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:border-sun-300 hover:bg-sun-50"
                  >
                    {g.name} in {cityName}
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-line bg-sun-50/60 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Nearby cities</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {otherCities.map((c) => (
                  <Link
                    key={c}
                    to="/c/$category/$city"
                    params={{ category, city: c.toLowerCase().replace(/\s+/g, "-") }}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-bold text-ink hover:border-sun-300 hover:bg-sun-50"
                  >
                    {genre.name} in {c}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function buildLongIntro(genreName: string, city: string): string[] {
  const g = genreName.toLowerCase();
  return [
    `Booking a ${g} photographer in ${city} is one of those decisions you only get one shot at — the work lives with you forever. PhotoLancer brings together verified ${g} photographers across ${city} so you can compare real portfolios, package pricing and reviews in one place, then book with payment held safely in escrow until the shoot is delivered.`,
    `${city} has a thriving community of ${g} photographers, ranging from boutique studios to in-demand freelancers who work across India. Whatever your style — candid and documentary, classic and editorial, or fashion-forward — there's a photographer here who shoots it well. Use the filters above to narrow by budget, availability and verified status.`,
    `Every photographer on PhotoLancer goes through a community verification by working pros from the India Photographers Club, so the portfolios you see are the photographer's actual work. Read genuine reviews left by past clients, message photographers directly, and confirm dates before you pay.`,
  ];
}

function buildCategoryFaqs(genreName: string, city: string): { q: string; a: string }[] {
  const g = genreName.toLowerCase();
  return [
    {
      q: `How much does a ${g} photographer cost in ${city}?`,
      a: `Pricing in ${city} varies widely with experience, hours, deliverables and the day of the week. Most ${g} photographers list a transparent starting price on their PhotoLancer profile — filter by your budget to see who fits, and request a custom quote for anything more specific.`,
    },
    {
      q: `How early should I book my ${g} photographer?`,
      a: `For peak ${g} dates in ${city} (especially wedding season and long weekends), top photographers are booked 4–9 months in advance. For other shoots, 2–4 weeks is usually enough — but the earlier, the better the choice.`,
    },
    {
      q: `Is my payment safe?`,
      a: `Yes. Every booking on PhotoLancer is held in escrow by our payment partner and only released to the photographer after the shoot is delivered and you've had time to review.`,
    },
    {
      q: `Are PhotoLancer photographers in ${city} verified?`,
      a: `Photographers marked Verified have been checked by working professionals from the India Photographers Club. Their portfolios reflect real work and their reviews come from past clients booked through the platform.`,
    },
    {
      q: `What if I need to cancel or reschedule?`,
      a: `Cancellation terms are set out in our refund policy and on each photographer's listing. Reschedules within a reasonable window are typically free, subject to the photographer's availability.`,
    },
  ];
}
