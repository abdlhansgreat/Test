import { useEffect, useState } from "react";
import { Flag, MessageSquare, ShieldCheck, User } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Stars } from "@/components/sun/Stars";
import { SunButton } from "@/components/sun/SunButton";
import { fetchPhotographerReviews, computeDistribution, type ReviewRow } from "@/lib/reviews";
import { cn } from "@/lib/utils";

interface Props {
  photographerId: string;
  ratingAvg: number;
  reviewCount: number;
}

export function ReviewsSection({ photographerId, ratingAvg, reviewCount }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotographerReviews(photographerId)
      .then((rs) => setReviews(rs))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [photographerId]);

  const dist = computeDistribution(reviews);
  const total = reviews.length || reviewCount;
  const avg = reviews.length
    ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
    : ratingAvg;

  const submitReport = async (reviewId: string) => {
    if (!user) { setReportMsg("Please sign in to report a review."); return; }
    setReportBusy(true); setReportMsg(null);
    const { error } = await supabase.from("review_reports").insert({
      review_id: reviewId,
      reporter_id: user.id,
      reason: reason.trim() || null,
    });
    setReportBusy(false);
    if (error) { setReportMsg(error.message); return; }
    setReportFor(null); setReason("");
    setReportMsg("Thanks — we'll review this report.");
    setTimeout(() => setReportMsg(null), 4000);
  };

  if (loading) {
    return (
      <div className="mt-4 rounded-3xl border border-line bg-white p-6 text-ink-muted shadow-soft">Loading reviews…</div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mt-4 rounded-3xl border border-dashed border-line bg-sun-50/30 p-10 text-center text-ink-muted">
        No reviews yet — be the first to share your experience.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {/* Summary */}
      <div className="rounded-3xl border border-line bg-white p-6 shadow-soft md:p-8">
        <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
          <div className="text-center md:text-left">
            <div className="font-display text-[56px] font-extrabold leading-none text-ink">{avg.toFixed(1)}</div>
            <div className="mt-2"><Stars value={avg} size={22} /></div>
            <div className="mt-1 text-[13px] text-ink-muted">{total} review{total === 1 ? "" : "s"}</div>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = dist[n as 1 | 2 | 3 | 4 | 5];
              const pct = total ? (count / total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3 text-[13px]">
                  <span className="w-6 font-semibold text-ink">{n}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sun-50">
                    <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-ink-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <ul className="space-y-4">
        {reviews.map((r) => {
          const name = r.profiles?.full_name ?? "Anonymous";
          return (
            <li key={r.id} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sun-50 text-sun-700">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-ink">{name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
                      <Stars value={r.rating} size={14} />
                      <span>{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                      {r.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-800">
                          <ShieldCheck className="h-3 w-3" /> Verified booking
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setReportFor(r.id); setReason(""); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-ink-muted hover:bg-sun-50 hover:text-ink"
                >
                  <Flag className="h-3.5 w-3.5" /> Report
                </button>
              </div>

              {r.title && <h4 className="mt-4 font-display text-lg font-extrabold text-ink">{r.title}</h4>}
              {r.body && <p className={cn("text-[15px] leading-relaxed text-ink", r.title ? "mt-1" : "mt-3")}>{r.body}</p>}

              {r.review_replies && (
                <div className="mt-4 rounded-2xl border border-line bg-sun-50/40 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-sun-700">
                    <MessageSquare className="h-3.5 w-3.5" /> Photographer's response
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink">{r.review_replies.body}</p>
                  <div className="mt-1 text-[11px] text-ink-muted">
                    {format(new Date(r.review_replies.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              )}

              {reportFor === r.id && (
                <div className="mt-4 rounded-2xl border border-line bg-white p-4">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Why are you reporting?</label>
                  <textarea
                    value={reason} onChange={(e) => setReason(e.target.value)}
                    rows={3} maxLength={500}
                    placeholder="Optional: tell us what's wrong with this review."
                    className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-[14px] outline-none focus:border-sun-500"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <SunButton size="sm" variant="secondary" onClick={() => setReportFor(null)}>Cancel</SunButton>
                    <SunButton size="sm" onClick={() => submitReport(r.id)} disabled={reportBusy}>
                      {reportBusy ? "Sending…" : "Submit report"}
                    </SunButton>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {reportMsg && (
        <div className="rounded-xl bg-sun-50 px-4 py-3 text-[13px] font-semibold text-sun-700">{reportMsg}</div>
      )}
    </div>
  );
}
