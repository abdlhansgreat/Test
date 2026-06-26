import { supabase } from "@/integrations/supabase/client";

export type SortKey = "recommended" | "top_rated" | "price_asc" | "most_reviewed" | "verified_work";
export type KindFilter = "both" | "studio" | "freelancer";

export interface SearchFilters {
  q?: string;
  city?: string;
  genres?: string[]; // slugs
  kind?: KindFilter;
  min?: number;
  max?: number;
  date?: string; // YYYY-MM-DD
  verified?: boolean;
  secondshoots?: boolean;
  rating?: number;
  sort?: SortKey;
}

export interface PhotographerResult {
  id: string;
  slug: string;
  business_name: string;
  base_city: string | null;
  starting_price: number | null;
  rating_avg: number | null;
  review_count: number | null;
  verified: boolean | null;
  featured: boolean | null;
  featured_until: string | null;
  available_for_second_shoots: boolean | null;
  response_time_hours: number | null;
  kind: string;
  genres: string[];
  verified_work_count: number;
  cover_url: string | null;
  is_demo?: boolean;
}


export function isCurrentlyFeatured(p: { featured: boolean | null; featured_until: string | null }) {
  return !!(p.featured && p.featured_until && new Date(p.featured_until) > new Date());
}

export async function searchPhotographers(f: SearchFilters): Promise<PhotographerResult[]> {
  let query = supabase
    .from("photographers")
    .select(
      `id, slug, business_name, base_city, service_cities, starting_price,
       rating_avg, review_count, verified, featured, featured_until, available_for_second_shoots,
       response_time_hours, kind, cover_url, is_demo,
       photographer_genres ( genres ( name, slug ) )`,
    )

    .eq("is_published", true);

  if (f.q) {
    query = query.or(`business_name.ilike.%${f.q}%,bio.ilike.%${f.q}%`);
  }
  if (f.city) {
    const c = f.city.trim();
    query = query.or(`base_city.ilike.%${c}%,service_cities.cs.{${c}}`);
  }
  if (f.kind && f.kind !== "both") {
    query = query.in("kind", [f.kind, "both"]);
  }
  if (typeof f.min === "number") query = query.gte("starting_price", f.min);
  if (typeof f.max === "number") query = query.lte("starting_price", f.max);
  if (f.verified) query = query.eq("verified", true);
  if (f.secondshoots) query = query.eq("available_for_second_shoots", true);
  if (typeof f.rating === "number") query = query.gte("rating_avg", f.rating);

  // Sorting (SQL-side preliminary order; we re-rank client-side for recommended/verified_work)
  switch (f.sort ?? "recommended") {
    case "top_rated":
      query = query.order("rating_avg", { ascending: false, nullsFirst: false });
      break;
    case "price_asc":
      query = query.order("starting_price", { ascending: true, nullsFirst: false });
      break;
    case "most_reviewed":
      query = query.order("review_count", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query
        .order("featured", { ascending: false, nullsFirst: false })
        .order("rating_avg", { ascending: false, nullsFirst: false });
  }

  query = query.limit(120);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []).map((r: any): PhotographerResult => ({
    id: r.id,
    slug: r.slug,
    business_name: r.business_name,
    base_city: r.base_city,
    starting_price: r.starting_price,
    rating_avg: r.rating_avg,
    review_count: r.review_count,
    verified: r.verified,
    featured: r.featured,
    featured_until: r.featured_until,
    available_for_second_shoots: r.available_for_second_shoots,
    response_time_hours: r.response_time_hours,
    kind: r.kind,
    cover_url: r.cover_url ?? null,
    is_demo: r.is_demo ?? false,
    genres: (r.photographer_genres ?? [])
      .map((pg: any) => pg.genres?.name)
      .filter(Boolean),
    verified_work_count: 0,
  }));


  // Genre filter — client side after fetching nested rows
  if (f.genres && f.genres.length > 0) {
    const slugSet = new Set(f.genres);
    rows = rows.filter((_row, i) => {
      const slugs: string[] = (data![i] as any).photographer_genres
        .map((pg: any) => pg.genres?.slug)
        .filter(Boolean);
      return slugs.some((s) => slugSet.has(s));
    });
  }

  // Date exclusion via availability
  if (f.date) {
    const { data: blocked } = await supabase
      .from("availability")
      .select("photographer_id")
      .eq("date", f.date)
      .in("status", ["blocked", "booked"]);
    const blockedSet = new Set((blocked ?? []).map((b) => b.photographer_id));
    rows = rows.filter((r) => !blockedSet.has(r.id));
  }

  // Verified work count per photographer (for ranking + badges)
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const slugs = rows.map((r) => r.slug);
    const [{ data: vw }, { data: ov }] = await Promise.all([
      supabase.from("portfolio_items").select("photographer_id").eq("verified", true).in("photographer_id", ids),
      supabase.from("image_overrides").select("slot_key, url").in("slot_key", slugs.map((s) => `studio:${s}`)),
    ]);
    const counts = new Map<string, number>();
    for (const r of vw ?? []) {
      const pid = (r as { photographer_id: string }).photographer_id;
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
    const overrideMap = new Map<string, string>();
    for (const r of (ov ?? []) as Array<{ slot_key: string; url: string }>) {
      overrideMap.set(r.slot_key.replace(/^studio:/, ""), r.url);
    }
    rows = rows.map((r) => ({
      ...r,
      verified_work_count: counts.get(r.id) ?? 0,
      cover_url: overrideMap.get(r.slug) ?? r.cover_url,
    }));
  }

  const sort = f.sort ?? "recommended";
  if (sort === "recommended") {
    // Featured first, then a blended score: rating + log(verified_work) bonus.
    rows.sort((a, b) => {
      const af = isCurrentlyFeatured(a) ? 1 : 0;
      const bf = isCurrentlyFeatured(b) ? 1 : 0;
      if (af !== bf) return bf - af;
      const sa = Number(a.rating_avg ?? 0) + Math.log1p(a.verified_work_count) * 0.25;
      const sb = Number(b.rating_avg ?? 0) + Math.log1p(b.verified_work_count) * 0.25;
      return sb - sa;
    });
  } else if (sort === "verified_work") {
    rows.sort((a, b) => {
      if (b.verified_work_count !== a.verified_work_count) return b.verified_work_count - a.verified_work_count;
      return Number(b.rating_avg ?? 0) - Number(a.rating_avg ?? 0);
    });
  }

  return rows;
}

export function toCardProps(r: PhotographerResult) {
  const tiles = ["tile-warm", "tile-dusk", "tile-rose"] as const;
  const idx = Math.abs(hashStr(r.id)) % tiles.length;
  const badge: "verified" | "second-shoots" | "top-rated" = r.verified
    ? "verified"
    : r.available_for_second_shoots
      ? "second-shoots"
      : "top-rated";
  return {
    photographerId: r.id,
    slug: r.slug,
    name: r.business_name,
    city: r.base_city ?? "—",
    rating: Number(r.rating_avg ?? 0),
    reviews: r.review_count ?? 0,
    fromPrice: r.starting_price ? `₹${Number(r.starting_price).toLocaleString("en-IN")}` : "On request",
    genres: r.genres.slice(0, 3),
    badge,
    isFeatured: isCurrentlyFeatured(r),
    respondsIn: r.response_time_hours ? `responds in ~${r.response_time_hours}h` : "responds quickly",
    tileClass: tiles[idx],
    verifiedWorkCount: r.verified_work_count,
    coverUrl: r.cover_url ?? null,
  };
}


function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
