import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EyeOff, Eye, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({ meta: [{ title: "Moderation — Admin" }] }),
  component: ModerationPage,
});

interface Report { id: string; review_id: string; reason: string; created_at: string;
  reviews?: { id: string; rating: number; title: string | null; body: string | null; hidden: boolean; photographer_id: string } | null; }

function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);

  const load = async () => {
    const { data } = await supabase.from("review_reports")
      .select("id, review_id, reason, created_at, reviews(id, rating, title, body, hidden, photographer_id)")
      .order("created_at", { ascending: false });
    setReports((data ?? []) as unknown as Report[]);
  };
  useEffect(() => { load(); }, []);

  const setHidden = async (reviewId: string, hidden: boolean) => {
    const { error } = await supabase.from("reviews").update({ hidden }).eq("id", reviewId);
    if (error) toast.error(error.message); else { toast.success(hidden ? "Hidden" : "Unhidden"); load(); }
  };
  const remove = async (reviewId: string) => {
    if (!confirm("Delete this review permanently?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <AdminLayout title="Moderation">
      {reports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center text-ink-muted shadow-soft">
          No reported reviews. The community is happy. 🌞
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <div key={rep.id} className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-sun-700">Reason</div>
                  <p className="mt-1 text-sm text-ink">{rep.reason}</p>
                  <div className="mt-3 rounded-2xl bg-sun-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <strong className="text-ink">{rep.reviews?.title ?? `Rated ${rep.reviews?.rating ?? "?"}/5`}</strong>
                      {rep.reviews?.hidden && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold text-ink-muted">Hidden</span>}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{rep.reviews?.body ?? "—"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {rep.reviews && (
                    <button onClick={() => setHidden(rep.reviews!.id, !rep.reviews!.hidden)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-sun-300 hover:text-sun-700">
                      {rep.reviews.hidden ? <><Eye className="h-3.5 w-3.5" /> Unhide</> : <><EyeOff className="h-3.5 w-3.5" /> Hide</>}
                    </button>
                  )}
                  {rep.reviews && (
                    <button onClick={() => remove(rep.reviews!.id)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-error hover:border-error">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
