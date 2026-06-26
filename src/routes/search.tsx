import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Filter, Grid3x3, List as ListIcon, Map as MapIcon, X } from "lucide-react";

import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SearchBar } from "@/components/sun/SearchBar";
import { PhotographerCard } from "@/components/sun/PhotographerCard";
import { SearchFilters, BUDGETS, type FiltersValue } from "@/components/sun/SearchFilters";
import {
  searchPhotographers,
  toCardProps,
  type PhotographerResult,
  type SortKey,
  type KindFilter,
} from "@/lib/photographer-search";
import { cn } from "@/lib/utils";
import { useSavedSet } from "@/hooks/use-saved-set";

const PhotographerMap = lazy(() =>
  import("@/components/sun/PhotographerMap").then((m) => ({ default: m.PhotographerMap })),
);

const searchSchema = z.object({
  q: fallback(z.string().optional(), undefined),
  city: fallback(z.string().optional(), undefined),
  genres: fallback(z.string().optional(), undefined), // comma-separated slugs
  kind: fallback(z.enum(["both", "studio", "freelancer"]).optional(), undefined),
  min: fallback(z.coerce.number().optional(), undefined),
  max: fallback(z.coerce.number().optional(), undefined),
  date: fallback(z.string().optional(), undefined),
  verified: fallback(z.coerce.boolean().optional(), undefined),
  secondshoots: fallback(z.coerce.boolean().optional(), undefined),
  rating: fallback(z.coerce.number().optional(), undefined),
  sort: fallback(z.enum(["recommended", "top_rated", "price_asc", "most_reviewed", "verified_work"]).optional(), undefined),
  view: fallback(z.enum(["grid", "list", "map"]).optional(), undefined),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Search photographers — PhotoLancer" },
      { name: "description", content: "Find verified photographers near you. Filter by city, genre, budget and availability." },
      { property: "og:title", content: "Search photographers — PhotoLancer" },
      { property: "og:description", content: "Find verified photographers near you. Filter by city, genre, budget and availability." },
      { property: "og:url", content: "https://photolancer.lovable.app/search" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://photolancer.lovable.app/search" }],
  }),
  component: SearchPage,
});

function budgetToRange(b: string): { min?: number; max?: number } {
  if (!b) return {};
  const [lo, hi] = b.split("-");
  return { min: lo ? Number(lo) : undefined, max: hi ? Number(hi) : undefined };
}

function rangeToBudget(min?: number, max?: number): string {
  if (min === undefined && max === undefined) return "";
  return `${min ?? ""}-${max ?? ""}`;
}

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const savedSet = useSavedSet();

  const filters: FiltersValue = useMemo(
    () => ({
      genres: search.genres ? search.genres.split(",").filter(Boolean) : [],
      kind: (search.kind as KindFilter) ?? "both",
      budget: rangeToBudget(search.min, search.max),
      date: search.date,
      verified: !!search.verified,
      secondshoots: !!search.secondshoots,
      rating: search.rating,
    }),
    [search],
  );

  const view = search.view ?? "grid";
  const sort: SortKey = (search.sort as SortKey) ?? "recommended";

  const [results, setResults] = useState<PhotographerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchPhotographers({
      q: search.q,
      city: search.city,
      genres: filters.genres,
      kind: filters.kind,
      min: search.min,
      max: search.max,
      date: search.date,
      verified: filters.verified,
      secondshoots: filters.secondshoots,
      rating: filters.rating,
      sort,
    })
      .then((r) => !cancelled && setResults(r))
      .catch((e) => !cancelled && (console.error(e), setResults([])))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search.q, search.city, search.min, search.max, search.date, sort, filters.genres.join(","), filters.kind, filters.verified, filters.secondshoots, filters.rating]);

  const updateFilters = (next: FiltersValue) => {
    const { min, max } = budgetToRange(next.budget);
    navigate({
      search: (prev: any) => ({
        ...prev,
        genres: next.genres.length ? next.genres.join(",") : undefined,
        kind: next.kind === "both" ? undefined : next.kind,
        min,
        max,
        date: next.date,
        verified: next.verified || undefined,
        secondshoots: next.secondshoots || undefined,
        rating: next.rating,
      }) as any,
    });
  };

  const clearAll = () => {
    navigate({ search: { q: search.q, city: search.city } as any });
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 md:px-8">
          <SearchBar defaultQ={search.q ?? ""} defaultCity={search.city ?? ""} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-soft">
              <SearchFilters value={filters} onChange={updateFilters} onClear={clearAll} />
            </div>
          </aside>

          <div className="flex flex-col gap-6">
            {/* Results header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-soft hover:border-sun-300 lg:hidden"
                >
                  <Filter className="h-4 w-4" /> Filters
                </button>
                <div className="text-sm text-ink-muted">
                  {loading ? "Searching…" : (
                    <>
                      <span className="font-bold text-ink">{results.length}</span> photographers found
                      {search.city && <> in <span className="font-bold text-ink">{search.city}</span></>}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                  Sort:
                  <select
                    value={sort}
                    onChange={(e) =>
                      navigate({ search: (p: any) => ({ ...p, sort: e.target.value as SortKey }) as any })
                    }
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-bold text-ink focus:border-sun-300 focus:outline-none"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="top_rated">Top rated</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="most_reviewed">Most reviewed</option>
                    <option value="verified_work">More verified work</option>
                  </select>
                </label>

                <div className="inline-flex rounded-full border border-line bg-white p-1">
                  {([
                    { v: "grid", I: Grid3x3, label: "Grid" },
                    { v: "list", I: ListIcon, label: "List" },
                    { v: "map", I: MapIcon, label: "Map" },
                  ] as const).map(({ v, I, label }) => (
                    <button
                      key={v}
                      type="button"
                      aria-label={label}
                      onClick={() => navigate({ search: (p: any) => ({ ...p, view: v }) as any })}
                      className={cn(
                        "rounded-full p-2 transition",
                        view === v ? "bg-gradient-primary text-white shadow-soft" : "text-ink-muted hover:text-sun-700",
                      )}
                    >
                      <I className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results body */}
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[380px] animate-pulse rounded-3xl border border-line bg-white" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line bg-white p-16 text-center">
                <div className="font-display text-2xl font-extrabold text-ink">No photographers match</div>
                <p className="mt-2 text-ink-muted">Try widening your filters or removing a city.</p>
                <button
                  onClick={clearAll}
                  className="mt-5 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white"
                >
                  Clear filters
                </button>
              </div>
            ) : view === "map" ? (
              <Suspense fallback={<div className="h-[600px] animate-pulse rounded-3xl bg-white" />}>
                <PhotographerMap results={results} />
              </Suspense>
            ) : view === "list" ? (
              <div className="flex flex-col gap-4">
                {results.map((r) => (
                  <PhotographerCard key={r.id} {...toCardProps(r)} initialSaved={savedSet.has(r.id)} />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((r) => (
                  <PhotographerCard key={r.id} {...toCardProps(r)} initialSaved={savedSet.has(r.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mobile filters drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[90%] max-w-sm overflow-y-auto bg-white p-6 shadow-warm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold text-ink">Filters</h2>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close" className="rounded-full p-2 hover:bg-sun-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SearchFilters
              value={filters}
              onChange={updateFilters}
              onApply={() => setDrawerOpen(false)}
              onClear={clearAll}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
