import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flag, Loader2, EyeOff, BadgeCheck, ExternalLink, Trash2, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrl } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/admin/portfolio-reports")({
  head: () => ({ meta: [{ title: "Portfolio reports — Admin · PhotoLancer" }] }),
  component: PortfolioReportsPage,
});

interface Report {
  id: string;
  portfolio_item_id: string;
  reporter_id: string | null;
  reason: string | null;
  created_at: string;
}

interface ItemDetail {
  id: string;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  source: string;
  verified: boolean;
  photographer_id: string;
  hidden?: boolean;
  photographer?: { slug: string; business_name: string };
}

function PortfolioReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [items, setItems] = useState<Record<string, ItemDetail>>({});
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: r } = await supabase
      .from("portfolio_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const rs = (r ?? []) as Report[];
    setReports(rs);

    const ids = Array.from(new Set(rs.map((x) => x.portfolio_item_id)));
    if (ids.length) {
      const { data: its } = await supabase
        .from("portfolio_items")
        .select("id, caption, media_url, thumbnail_url, source, verified, photographer_id, photographers:photographer_id(slug, business_name)")
        .in("id", ids);
      const map: Record<string, ItemDetail> = {};
      const urlMap: Record<string, string | null> = {};
      await Promise.all(
        ((its ?? []) as any[]).map(async (i) => {
          map[i.id] = {
            id: i.id,
            caption: i.caption,
            media_url: i.media_url,
            thumbnail_url: i.thumbnail_url,
            source: i.source,
            verified: !!i.verified,
            photographer_id: i.photographer_id,
            photographer: i.photographers ? { slug: i.photographers.slug, business_name: i.photographers.business_name } : undefined,
          };
          urlMap[i.id] = await resolveMediaUrl(i.thumbnail_url ?? i.media_url, "portfolio");
        }),
      );
      setItems(map);
      setUrls(urlMap);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const removeImage = async (itemId: string) => {
    if (!confirm("Permanently delete this image? Use this only for confirmed violations.")) return;
    setBusy(itemId);
    await supabase.from("portfolio_items").delete().eq("id", itemId);
    setBusy(null);
    await load();
  };

  const stripVerified = async (itemId: string) => {
    setBusy(itemId);
    await supabase.from("portfolio_items")
      .update({ verified: false, verified_booking_id: null, verified_at: null } as never)
      .eq("id", itemId);
    setBusy(null);
    await load();
  };

  const dismiss = async (reportId: string) => {
    setBusy(reportId);
    await supabase.from("portfolio_reports").delete().eq("id", reportId);
    setBusy(null);
    await load();
  };

  return (
    <AdminLayout title="Portfolio reports">
      <p className="text-ink-muted">Review images that members have flagged as stolen, misleading, or not the photographer's own work.</p>

      {loading ? (
        <div className="mt-8 text-ink-muted">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-sun-50/40 p-12 text-center">
          <Flag className="mx-auto h-8 w-8 text-sun-600" />
          <p className="mt-3 font-display text-lg font-extrabold text-ink">No portfolio reports</p>
          <p className="text-ink-muted">Reported images will appear here for review.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reports.map((r) => {
            const it = items[r.portfolio_item_id];
            return (
              <div key={r.id} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="md:w-48 shrink-0">
                    <div className="aspect-square w-full overflow-hidden rounded-2xl bg-sun-50">
                      {urls[r.portfolio_item_id] ? (
                        <img src={urls[r.portfolio_item_id]!} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-ink-muted">No preview</div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {it?.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2 py-0.5 text-[11px] font-bold text-sun-700">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{it?.source ?? "—"}</span>
                      <span className="text-[12px] text-ink-muted">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 font-display text-base font-extrabold text-ink">
                      {it?.photographer ? (
                        <a href={`/p/${it.photographer.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                          {it.photographer.business_name} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : "Unknown photographer"}
                    </div>
                    {it?.caption && <p className="mt-1 text-[13px] text-ink-muted">"{it.caption}"</p>}
                    <div className="mt-3 rounded-xl bg-sun-50/50 px-3 py-2 text-[13px] text-ink">
                      <strong>Reason:</strong> {r.reason ?? "—"}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {it?.verified && (
                        <SunButton size="sm" variant="secondary" onClick={() => stripVerified(it.id)} disabled={busy === it.id}>
                          {busy === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Strip verified flag
                        </SunButton>
                      )}
                      {it && (
                        <SunButton size="sm" variant="secondary" onClick={() => removeImage(it.id)} disabled={busy === it.id}>
                          {busy === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Remove image
                        </SunButton>
                      )}
                      <button onClick={() => dismiss(r.id)} disabled={busy === r.id}
                        className="inline-flex items-center gap-1 rounded-xl border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-muted hover:border-sun-300 hover:text-ink disabled:opacity-60">
                        {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />} Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
