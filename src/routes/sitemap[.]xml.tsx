import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://photolancer.lovable.app";

const POPULAR_CITIES = [
  "delhi-ncr", "mumbai", "bengaluru", "hyderabad", "chennai",
  "pune", "kolkata", "ahmedabad", "jaipur", "goa",
];
const POPULAR_GENRES = [
  "wedding", "pre-wedding", "fashion", "newborn", "maternity",
  "product", "cinematography", "drone", "events",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
        let slugs: string[] = [];
        try {
          if (url && key) {
            const sb = createClient(url, key);
            const { data } = await sb.from("photographers").select("slug").limit(5000);
            slugs = (data ?? []).map((r) => r.slug as string).filter(Boolean);
          }
        } catch {
          // ignore — emit a skeleton sitemap
        }

        const urls: { loc: string; changefreq?: string; priority?: string }[] = [
          { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
          { loc: `${BASE_URL}/search`, changefreq: "daily", priority: "0.8" },
          { loc: `${BASE_URL}/gigs`, changefreq: "daily", priority: "0.7" },
          { loc: `${BASE_URL}/inspiration`, changefreq: "weekly", priority: "0.6" },
        ];
        for (const g of POPULAR_GENRES) {
          for (const c of POPULAR_CITIES) {
            urls.push({ loc: `${BASE_URL}/c/${g}/${c}`, changefreq: "weekly", priority: "0.7" });
          }
        }
        for (const s of slugs) {
          urls.push({ loc: `${BASE_URL}/p/${s}`, changefreq: "weekly", priority: "0.6" });
        }

        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls.map(
            (u) =>
              `  <url><loc>${u.loc}</loc>${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}${u.priority ? `<priority>${u.priority}</priority>` : ""}</url>`,
          ),
          `</urlset>`,
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
