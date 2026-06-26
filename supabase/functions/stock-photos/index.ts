// Stock photos proxy with strong India bias.
// - Rewrites every query to enforce Indian context ("india" / "indian").
// - Fetches a larger pool from Unsplash (then Pexels) and scores results to
//   prefer items whose alt_description / tags / location indicate India, and
//   penalises obviously Western terms.
// - In-memory cache per instance, 1h.

const CACHE = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 60 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface StockImage {
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  source: "unsplash" | "pexels";
}

const INDIA_TERMS = [
  "india", "indian", "hindu", "sikh", "punjabi", "marwari", "telugu", "tamil",
  "bengali", "south indian", "north indian", "rajasthan", "rajasthani", "kerala",
  "saree", "sari", "lehenga", "sherwani", "kurta", "dupatta",
  "mehendi", "mehndi", "haldi", "sangeet", "baraat", "mandap", "pheras", "vidaai",
  "jaipur", "udaipur", "mumbai", "delhi", "goa", "kolkata", "chennai",
  "bengaluru", "bangalore", "hyderabad", "varanasi", "agra", "amritsar",
];

const WESTERN_PENALTY = [
  "white dress", "white gown", "white wedding dress", "veil", "tuxedo",
  "groomsmen", "bridesmaid", "champagne", "wine", "beer", "sneaker",
  "snow", "winter", "christmas", "santa", "thanksgiving", "halloween",
  "blonde", "blond ", "european", "american", "british",
  "burger", "pasta", "pizza", "steak",
];

function ensureIndianQuery(raw: string): string {
  const q = raw.trim().toLowerCase();
  if (INDIA_TERMS.some((t) => q.includes(t))) return raw;
  return `${raw} indian`;
}

function indianScore(text: string): number {
  const t = (text || "").toLowerCase();
  let s = 0;
  for (const term of INDIA_TERMS) if (t.includes(term)) s += 3;
  for (const term of WESTERN_PENALTY) if (t.includes(term)) s -= 5;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const rawQ = (url.searchParams.get("q") ?? "indian wedding photography").slice(0, 120);
  const q = ensureIndianQuery(rawQ);
  const count = Math.min(Math.max(Number(url.searchParams.get("count") ?? "12"), 1), 30);
  const pool = Math.min(30, Math.max(count, 24));

  const key = `${q}:${count}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Response.json({ images: hit.data, cached: true, query: q }, { headers: CORS });
  }

  let images: StockImage[] = [];
  let scored: { img: StockImage; s: number }[] = [];

  const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (unsplashKey) {
    try {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${pool}&content_filter=high&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } },
      );
      if (r.ok) {
        const j = await r.json();
        scored = (j.results ?? []).map((p: {
          urls: { regular: string; small: string };
          alt_description: string | null;
          description: string | null;
          tags?: { title: string }[];
          location?: { title?: string; country?: string };
          user: { name: string };
        }) => {
          const text = [
            p.alt_description ?? "",
            p.description ?? "",
            (p.tags ?? []).map((t) => t.title).join(" "),
            p.location?.title ?? "",
            p.location?.country ?? "",
          ].join(" ");
          return {
            img: {
              url: p.urls.regular,
              thumb: p.urls.small,
              alt: p.alt_description ?? q,
              credit: `Photo by ${p.user.name} on Unsplash`,
              source: "unsplash" as const,
            },
            s: indianScore(text),
          };
        });
      }
    } catch (e) { console.error("unsplash", e); }
  }

  if (scored.length === 0) {
    const pexelsKey = Deno.env.get("PEXELS_API_KEY");
    if (pexelsKey) {
      try {
        const r = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${pool}&orientation=landscape`,
          { headers: { Authorization: pexelsKey } },
        );
        if (r.ok) {
          const j = await r.json();
          scored = (j.photos ?? []).map((p: {
            src: { large: string; medium: string };
            alt: string | null;
            photographer: string;
          }) => ({
            img: {
              url: p.src.large,
              thumb: p.src.medium,
              alt: p.alt ?? q,
              credit: `Photo by ${p.photographer} on Pexels`,
              source: "pexels" as const,
            },
            s: indianScore(p.alt ?? ""),
          }));
        }
      } catch (e) { console.error("pexels", e); }
    }
  }

  // Drop heavily Western results, then sort by Indian score desc.
  images = scored
    .filter((x) => x.s > -5)
    .sort((a, b) => b.s - a.s)
    .slice(0, count)
    .map((x) => x.img);

  if (images.length > 0) CACHE.set(key, { at: Date.now(), data: images });
  return Response.json({ images, cached: false, query: q }, { headers: CORS });
});
