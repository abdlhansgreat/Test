import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Star as StarIcon } from "lucide-react";
import { format } from "date-fns";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { SunButton } from "@/components/sun/SunButton";
import { Stars } from "@/components/sun/Stars";
import { supabase } from "@/integrations/supabase/client";
import { fetchPhotographerReviews, type ReviewRow } from "@/lib/reviews";

export const Route = createFileRoute("/_authenticated/studio/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — PhotoLancer Studio" },
      { name: "description", content: "Read and reply to client reviews." },
    ],
  }),
  component: StudioReviewsPage,
});

function StudioReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: p } = await supabase
      .from("photographers").select("id").eq("profile_id", u.user.id).maybeSingle();
    if (!p) { setLoading(false); return; }
    const rs = await fetchPhotographerReviews(p.id);
    setReviews(rs);
    setDrafts(Object.fromEntries(rs.map((r) => [r.id, r.review_replies?.body ?? ""])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveReply = async (review: ReviewRow) => {
    const body = (drafts[review.id] ?? "").trim();
    if (!body) return;
    setBusyId(review.id); setErr(null);
    let error;
    if (review.review_replies) {
      ({ error } = await supabase.from("review_replies")
        .update({ body }).eq("review_id", review.id));
    } else {
      ({ error } = await supabase.from("review_replies")
        .insert({ review_id: review.id, body }));
    }
    setBusyId(null);
    if (error) { setErr(error.message); return; }
    await load();
  };

  return (
    <StudioLayout title="Reviews">
      <div>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">Reviews</h1>
        <p className="mt-1 text-ink-muted">Reply once, publicly, to any review on your profile.</p>

        {loading ? (
          <div className="mt-8 text-ink-muted">Loading…</div>
        ) : reviews.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-sun-50/30 p-10 text-center">
            <StarIcon className="h-7 w-7 text-sun-500" />
            <p className="text-ink-muted">No reviews yet. Complete bookings and your reviews will land here.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-ink">{r.profiles?.full_name ?? "Anonymous"}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-muted">
                      <Stars value={r.rating} size={14} />
                      <span>{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
                {r.title && <h4 className="mt-3 font-display text-lg font-extrabold text-ink">{r.title}</h4>}
                {r.body && <p className="mt-1 text-[15px] leading-relaxed text-ink">{r.body}</p>}

                <div className="mt-4 rounded-2xl border border-line bg-sun-50/30 p-4">
                  <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-sun-700">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {r.review_replies ? "Your reply" : "Reply publicly"}
                  </div>
                  <textarea
                    value={drafts[r.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    rows={3} maxLength={1000}
                    placeholder="Thanks so much — it was a pleasure working with you…"
                    className="mt-2 w-full rounded-xl border border-line bg-white p-3 text-[14px] outline-none focus:border-sun-500"
                  />
                  <div className="mt-3 flex justify-end">
                    <SunButton size="sm" onClick={() => saveReply(r)} disabled={busyId === r.id || !(drafts[r.id] ?? "").trim()}>
                      {busyId === r.id ? "Saving…" : r.review_replies ? "Update reply" : "Post reply"}
                    </SunButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {err && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      </div>
    </StudioLayout>
  );
}
