import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Camera } from "lucide-react";

const URL = "https://photolancer.lovable.app/inspiration";

export const Route = createFileRoute("/inspiration")({
  head: () => ({
    meta: [
      { title: "Real shoots — Inspiration gallery | PhotoLancer" },
      { name: "description", content: "Real photographs from verified PhotoLancer photographers — weddings, portraits, fashion, events and more across India." },
      { property: "og:title", content: "Real shoots — Inspiration gallery" },
      { property: "og:description", content: "Real photographs from verified PhotoLancer photographers across India." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: InspirationPage,
});

type Item = {
  id: string;
  photographer_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  photographer: {
    slug: string;
    business_name: string;
    base_city: string | null;
    verified: boolean | null;
    featured: boolean | null;
  } | null;
  signed?: string | null;
};

function InspirationPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Pull portfolio_items joined to photographers. Show items that are verified,
      // OR belong to a verified/featured photographer (so demo seed populates too).
      const { data } = await supabase
        .from("portfolio_items")
        .select(`
          id, photographer_id, media_url, thumbnail_url, caption, verified,
          photographer:photographers!inner ( slug, business_name, base_city, verified, featured, featured_until, is_published )
        `)
        .order("created_at", { ascending: false })
        .limit(160);
      const filtered = ((data as any[]) ?? []).filter((it) => {
        const p = it.photographer;
        if (!p || !p.is_published) return false;
        const featured = p.featured && p.featured_until && new Date(p.featured_until) > new Date();
        return it.verified || p.verified || featured;
      });
      // sign storage URLs
      const signed = await Promise.all(filtered.map(async (it) => {
        const src = it.media_url ?? it.thumbnail_url;
        if (!src) return { ...it, signed: null };
        if (/^https?:\/\//.test(src)) return { ...it, signed: src };
        const { data } = await supabase.storage.from("portfolio").createSignedUrl(src, 3600);
        return { ...it, signed: data?.signedUrl ?? null };
      }));
      setItems(signed.filter((it) => it.signed) as Item[]);
      setLoading(false);
    })();
  }, []);


  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-6 md:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
            <Sparkles className="h-3.5 w-3.5" /> Real shoots
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink md:text-5xl">
            Inspiration from <span className="text-gradient">real photographers</span>
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-muted">
            Every photo here is real work by a verified photographer on PhotoLancer. Tap any image to view their profile and check availability.
          </p>
        </header>

        {loading ? (
          <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="mb-4 break-inside-avoid rounded-2xl bg-sun-50" style={{ height: 160 + ((i * 53) % 200) }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-line bg-white p-16 text-center">
            <Camera className="mx-auto h-10 w-10 text-sun-400" />
            <div className="mt-4 font-display text-2xl font-extrabold text-ink">No real shoots yet</div>
            <p className="mt-2 text-ink-muted">As verified and featured photographers add portfolios, their best work will appear here.</p>
            <Link to="/search" className="mt-5 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft">
              Browse photographers
            </Link>
          </div>
        ) : (
          <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {items.map((it) => (
              <Link
                key={it.id}
                to="/p/$slug"
                params={{ slug: it.photographer!.slug }}
                className="group mb-4 block break-inside-avoid overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-warm"
              >
                <div className="relative">
                  <img
                    src={it.signed!}
                    alt={it.caption ?? it.photographer!.business_name}
                    className="w-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <div className="text-[13px] font-extrabold text-white">{it.photographer!.business_name}</div>
                    {it.photographer!.base_city ? (
                      <div className="text-[11px] text-white/85">{it.photographer!.base_city}</div>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
