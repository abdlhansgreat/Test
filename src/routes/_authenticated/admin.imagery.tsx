import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ImageIcon, Trash2, Check, ExternalLink, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchStock, INDIAN_QUERIES, CITY_QUERIES, pickStock, cityImage,
  loadOverrides, StockImage,
} from "@/lib/stock-images";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/imagery")({
  component: AdminImageryPage,
});

type Slot = {
  key: string;
  label: string;
  query: string;
  preview?: string;
};

const CATEGORY_SLUGS = [
  "wedding", "pre-wedding", "fashion", "newborn", "maternity",
  "product", "cinematography", "drone", "events",
] as const;

const HERO_SLOTS: Slot[] = [
  { key: "hero:main",     label: "Hero — main",     query: INDIAN_QUERIES.wedding,      preview: pickStock("wedding", 0).url },
  { key: "hero:dusk",     label: "Hero — dusk",     query: INDIAN_QUERIES["pre-wedding"], preview: pickStock("pre-wedding", 1).url },
  { key: "hero:rose",     label: "Hero — fashion",  query: INDIAN_QUERIES.fashion,      preview: pickStock("fashion", 0).url },
  { key: "hero:portrait", label: "Hero — profile",  query: INDIAN_QUERIES.bride,        preview: pickStock("portrait", 0).url },
];

function AdminImageryPage() {
  const [overrides, setOverrides] = useState<Record<string, { url: string; thumb: string | null; alt: string | null }>>({});
  const [studios, setStudios] = useState<Array<{ slug: string; business_name: string; cover_url: string | null }>>([]);
  const [cities, setCities] = useState<Array<{ slug: string; name: string }>>([]);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pasted, setPasted] = useState("");

  async function refresh() {
    const [{ data: ov }, { data: ps }, { data: cs }] = await Promise.all([
      supabase.from("image_overrides").select("slot_key, url, thumb, alt"),
      supabase.from("photographers").select("slug, business_name, cover_url").eq("is_demo", true).order("business_name"),
      supabase.from("cities").select("slug, name").order("popular", { ascending: false }).order("name").limit(20),
    ]);
    const map: typeof overrides = {};
    for (const r of (ov ?? []) as Array<{ slot_key: string; url: string; thumb: string | null; alt: string | null }>) {
      map[r.slot_key] = { url: r.url, thumb: r.thumb, alt: r.alt };
    }
    setOverrides(map);
    setStudios((ps ?? []) as typeof studios);
    setCities((cs ?? []) as typeof cities);
    await loadOverrides(true);
  }

  useEffect(() => { refresh(); }, []);

  const slots = useMemo<Slot[]>(() => {
    const cats = CATEGORY_SLUGS.map<Slot>((s) => ({
      key: `category:${s}`,
      label: `Category — ${s}`,
      query: INDIAN_QUERIES[s as keyof typeof INDIAN_QUERIES],
      preview: pickStock(s, 0).url,
    }));
    const cityTiles = cities.map<Slot>((c) => ({
      key: `city:${c.slug}`,
      label: `City — ${c.name}`,
      query: CITY_QUERIES[c.slug] ?? `${c.name} india`,
      preview: cityImage(c.slug).url,
    }));
    const studioTiles = studios.map<Slot>((p) => ({
      key: `studio:${p.slug}`,
      label: `Studio cover — ${p.business_name}`,
      query: INDIAN_QUERIES.wedding,
      preview: p.cover_url ?? undefined,
    }));
    return [...HERO_SLOTS, ...cats, ...cityTiles, ...studioTiles];
  }, [cities, studios]);

  async function search() {
    if (!activeSlot) return;
    setLoading(true);
    try {
      const imgs = await fetchStock(query || activeSlot.query, 24);
      setResults(imgs);
    } finally { setLoading(false); }
  }

  async function pick(img: { url: string; thumb?: string | null; alt?: string | null; credit?: string | null }) {
    if (!activeSlot) return;
    const { error } = await supabase.from("image_overrides").upsert({
      slot_key: activeSlot.key,
      url: img.url,
      thumb: img.thumb ?? null,
      alt: img.alt ?? null,
      credit: img.credit ?? null,
    }, { onConflict: "slot_key" });
    if (error) { toast.error(error.message); return; }
    toast.success("Image saved for this slot.");
    setPasted("");
    await refresh();
  }

  async function clear(slotKey: string) {
    const { error } = await supabase.from("image_overrides").delete().eq("slot_key", slotKey);
    if (error) { toast.error(error.message); return; }
    toast.success("Override removed.");
    await refresh();
  }

  function openSlot(s: Slot) {
    setActiveSlot(s);
    setQuery(s.query);
    setResults([]);
    setPasted("");
  }

  return (
    <AdminLayout title="Imagery">
      <p className="max-w-2xl text-[15px] text-ink-muted">
        Hand-pick the photo for any tile on the site. Search the stock library with an Indian query, click an
        image to pin it, or paste a direct URL for full control. Selected images always win over auto-fetched ones.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((s) => {
          const o = overrides[s.key];
          const url = o?.url || s.preview;
          return (
            <button
              key={s.key}
              onClick={() => openSlot(s)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-warm"
            >
              <div className="relative aspect-[5/4] w-full bg-sun-50">
                {url ? (
                  <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-sun-700"><ImageIcon className="h-7 w-7" /></div>
                )}
                {o && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-success/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                    <Check className="h-3 w-3" /> Pinned
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-ink">{s.label}</div>
                  <div className="truncate text-[11px] text-ink-muted">{s.key}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeSlot && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/60 p-4" onClick={() => setActiveSlot(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-warm">
            <div className="flex items-center justify-between gap-3 border-b border-line p-5">
              <div className="min-w-0">
                <div className="font-display text-lg font-extrabold text-ink truncate">{activeSlot.label}</div>
                <div className="truncate text-[12px] text-ink-muted">{activeSlot.key}</div>
              </div>
              <div className="flex items-center gap-2">
                {overrides[activeSlot.key] && (
                  <SunButton variant="ghost" size="sm" onClick={() => clear(activeSlot.key)}>
                    <Trash2 className="h-4 w-4" /> Remove pin
                  </SunButton>
                )}
                <button onClick={() => setActiveSlot(null)} className="rounded-full px-3 py-1.5 text-sm font-bold text-ink-muted hover:bg-sun-50">Close</button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative flex-1 min-w-[260px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") search(); }}
                    placeholder="Search Indian stock photos…"
                    className="w-full rounded-full border border-line bg-white py-2.5 pl-9 pr-3 text-sm focus:border-sun-300 focus:outline-none"
                  />
                </label>
                <SunButton onClick={search} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
                </SunButton>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="…or paste a direct image URL"
                  className="flex-1 min-w-[260px] rounded-full border border-line bg-white px-4 py-2.5 text-sm focus:border-sun-300 focus:outline-none"
                />
                <SunButton
                  variant="secondary"
                  disabled={!/^https?:\/\//.test(pasted)}
                  onClick={() => pick({ url: pasted, thumb: pasted, alt: activeSlot.label, credit: "Custom upload URL" })}
                >
                  <ExternalLink className="h-4 w-4" /> Use this URL
                </SunButton>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {results.length === 0 ? (
                  <div className="grid place-items-center rounded-2xl border border-dashed border-sun-300/60 bg-sun-50/40 px-6 py-12 text-center text-ink-muted">
                    Search to see results — every query is biased toward Indian photography.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {results.map((r, i) => (
                      <button key={i} onClick={() => pick(r)} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-sun-50">
                        <img src={r.thumb || r.url} alt={r.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" />
                        <div className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/30" />
                        <span className="absolute left-2 top-2 hidden rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sun-700 group-hover:inline">Pin</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
