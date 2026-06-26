/**
 * Indian-photography catalog + admin-curated slot system.
 *
 * - INDIAN_QUERIES: per genre / ceremony / city, the exact Unsplash queries
 *   to use. All explicitly Indian.
 * - STOCK: a small bundled fallback set used only when the stock-photos edge
 *   function is unreachable and no override exists. Hand-picked Indian
 *   wedding / bridal / fashion / jewellery photos under Unsplash License.
 * - image_overrides table: admin-curated picks for any slot key.
 *   `fetchSlot(slot, query)` returns the override if present, otherwise the
 *   live API result, otherwise a fallback.
 */

import { supabase } from "@/integrations/supabase/client";

export type StockImage = {
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  source: "unsplash" | "pexels";
};

function u(id: string, alt: string, credit = "Unsplash"): StockImage {
  return {
    url: `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`,
    thumb: `https://images.unsplash.com/photo-${id}?w=600&q=70&auto=format&fit=crop`,
    alt,
    credit: `Photo on ${credit}`,
    source: "unsplash",
  };
}

/** Per-context queries — every query is explicitly Indian. */
export const INDIAN_QUERIES = {
  wedding: "indian wedding ceremony bride and groom",
  "pre-wedding": "indian pre wedding couple photoshoot",
  fashion: "indian model saree lehenga editorial",
  newborn: "indian newborn baby photoshoot",
  maternity: "indian maternity shoot saree",
  product: "indian bridal jewellery gold kundan",
  cinematography: "indian wedding cinematography candid",
  drone: "indian destination wedding palace aerial",
  events: "indian sangeet haldi mehendi celebration",
  portrait: "indian portrait saree natural light",
  food: "indian thali biryani food styling",
  haldi: "haldi ceremony indian wedding",
  mehendi: "mehendi ceremony henna indian bride",
  sangeet: "sangeet night indian wedding dance",
  baraat: "baraat indian groom procession",
  bride: "indian bride portrait lehenga jewellery",
  city: "india city street",
} as const;

export const CITY_QUERIES: Record<string, string> = {
  "delhi-ncr": "delhi india gate qutub minar",
  delhi: "delhi india gate qutub minar",
  mumbai: "mumbai marine drive gateway of india",
  bengaluru: "bengaluru bangalore india city",
  bangalore: "bengaluru bangalore india city",
  jaipur: "jaipur hawa mahal city palace rajasthan",
  goa: "goa beach palolem india",
  hyderabad: "hyderabad charminar india",
  chennai: "chennai marina beach india",
  pune: "pune india shaniwar wada",
  kolkata: "kolkata howrah bridge victoria memorial",
  ahmedabad: "ahmedabad gujarat sabarmati india",
  chandigarh: "chandigarh india rock garden",
  udaipur: "udaipur city palace lake pichola",
};

/** Bundled fallback — small, Indian. */
export const STOCK: Record<string, StockImage[]> = {
  wedding: [
    u("1583394293214-28a4b9b41e7d", "Indian bride portrait"),
    u("1597157639073-69284dc0fdaf", "Indian wedding ceremony"),
    u("1606216794074-735e91aa2c92", "Indian wedding couple"),
    u("1583939003579-730e3918a45a", "Indian wedding mandap"),
    u("1604017011826-d3b4c23f8914", "Indian wedding rings"),
    u("1519225421980-715cb0215aed", "Indian wedding candid"),
    u("1591604466107-ec97de577aff", "Indian bridal jewellery"),
    u("1610208234762-46cd33d0c0c8", "Haldi ceremony"),
  ],
  "pre-wedding": [
    u("1465495976277-4387d4b0b4c6", "Indian pre-wedding couple"),
    u("1525253013412-55c1a69a5738", "Indian couple sunset"),
    u("1583939411023-14783179e581", "Indian couple holding hands"),
    u("1529636798458-92182e662485", "Indian couple in love"),
    u("1502824932014-04a02b405f80", "Indian couple beach"),
  ],
  fashion: [
    u("1490481651871-ab68de25d43d", "Indian fashion editorial"),
    u("1502716119720-b23a93e5fe1b", "Indian model portrait"),
    u("1487412720507-e7ab37603c6f", "Saree editorial"),
    u("1488161628813-04466f872be2", "Indian portrait warm light"),
  ],
  newborn: [
    u("1519689680058-324335c77eba", "Newborn baby"),
    u("1544776527-68e63addedf7", "Newborn portrait"),
    u("1607215114718-1b27c8a7fb0d", "Baby tiny feet"),
  ],
  maternity: [
    u("1518562180175-34a163b1a9a6", "Maternity portrait"),
    u("1531123414780-f74242c2b052", "Mother-to-be golden hour"),
  ],
  product: [
    u("1591604466107-ec97de577aff", "Indian bridal jewellery"),
    u("1604017011826-d3b4c23f8914", "Indian wedding rings"),
    u("1505740420928-5e560c06d30e", "Indian cosmetics"),
    u("1523275335684-37898b6baf30", "Jewellery product shot"),
  ],
  events: [
    u("1610208234762-46cd33d0c0c8", "Haldi ceremony"),
    u("1602074051259-bbd1e4d9e6d6", "Mehendi hands"),
    u("1492684223066-81342ee5ff30", "Indian celebration crowd"),
  ],
  cinematography: [
    u("1492691527719-9d1e07e534b4", "Cinema camera setup"),
    u("1583939003579-730e3918a45a", "Indian wedding film"),
  ],
  drone: [
    u("1473968512647-3e447244af8f", "Wedding aerial"),
    u("1606216794074-735e91aa2c92", "Indian wedding venue"),
  ],
  portrait: [
    u("1488161628813-04466f872be2", "Portrait warm light"),
    u("1502716119720-b23a93e5fe1b", "Indian model portrait"),
  ],
  food: [
    u("1565299624946-b28f40a0ae38", "Indian thali overhead"),
    u("1504674900247-0877df9cc836", "Plated Indian dish"),
  ],
  city: [
    u("1587474260584-136574528ed5", "Delhi at sunset"),
    u("1567157577867-05ccb1388e66", "Mumbai marine drive"),
    u("1582510003544-4d00b7f74220", "Bengaluru cityscape"),
    u("1599661046289-e31897846e41", "Jaipur palace"),
    u("1512343879784-a960bf40e7f2", "Goa beach"),
    u("1564507592333-c60657eea523", "Hyderabad Charminar"),
  ],
};

/** Synchronous deterministic fallback pick. */
export function pickStock(genre: string, idx = 0): StockImage {
  const key = genre.toLowerCase();
  const bucket = STOCK[key] ?? STOCK.wedding;
  return bucket[Math.abs(idx) % bucket.length];
}

const CITY_MAP: Record<string, number> = {
  "delhi-ncr": 0, delhi: 0,
  mumbai: 1,
  bengaluru: 2, bangalore: 2,
  jaipur: 3,
  goa: 4,
  hyderabad: 5,
};
export function cityImage(slug: string): StockImage {
  const idx = CITY_MAP[slug.toLowerCase()] ?? Math.abs(hash(slug)) % STOCK.city.length;
  return STOCK.city[idx];
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Fetch from edge function (Indian-biased), fallback to local STOCK. */
export async function fetchStock(query: string, count = 12): Promise<StockImage[]> {
  try {
    const res = await fetch(
      `https://biyluzhhwpmxhysworhu.supabase.co/functions/v1/stock-photos?q=${encodeURIComponent(query)}&count=${count}`,
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.images) && json.images.length > 0) return json.images;
    }
  } catch { /* fall through */ }
  const key = Object.keys(STOCK).find((k) => query.toLowerCase().includes(k)) ?? "wedding";
  return STOCK[key].slice(0, count);
}

// ---------------- Admin override system ----------------

export type Override = {
  slot_key: string;
  url: string;
  thumb: string | null;
  alt: string | null;
  credit: string | null;
};

let _overrides: Map<string, Override> | null = null;
let _loading: Promise<Map<string, Override>> | null = null;

export async function loadOverrides(force = false): Promise<Map<string, Override>> {
  if (_overrides && !force) return _overrides;
  if (_loading && !force) return _loading;
  _loading = (async () => {
    const { data } = await supabase
      .from("image_overrides")
      .select("slot_key, url, thumb, alt, credit");
    const map = new Map<string, Override>();
    for (const r of (data ?? []) as Override[]) map.set(r.slot_key, r);
    _overrides = map;
    _loading = null;
    return map;
  })();
  return _loading;
}

export function getOverride(slot: string): Override | undefined {
  return _overrides?.get(slot);
}

/**
 * Resolve a slot to an image: admin override → live API → fallback.
 * Always returns a StockImage. The override always wins.
 */
export async function fetchSlot(
  slot: string,
  query: string,
  fallback?: StockImage,
): Promise<StockImage> {
  const overrides = await loadOverrides();
  const o = overrides.get(slot);
  if (o) {
    return {
      url: o.url,
      thumb: o.thumb || o.url,
      alt: o.alt || query,
      credit: o.credit || "",
      source: "unsplash",
    };
  }
  const list = await fetchStock(query, 1);
  return list[0] ?? fallback ?? pickStock("wedding", 0);
}
