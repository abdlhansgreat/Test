import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SunButton } from "@/components/sun/SunButton";
import { StarPicker } from "@/components/sun/Stars";

interface Props {
  bookingId: string;
  photographerId: string;
  reviewerId: string;
  photographerName: string;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReviewForm({ bookingId, photographerId, reviewerId, photographerName, open, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      reviewer_id: reviewerId,
      photographer_id: photographerId,
      rating,
      title: title.trim() || null,
      body: body.trim() || null,
      verified: true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border border-line bg-white p-6 shadow-warm md:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink">Review {photographerName}</h2>
            <p className="mt-1 text-[14px] text-ink-muted">Help others by sharing your experience.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-ink-muted hover:bg-sun-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          <label className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Rating</label>
          <div className="mt-2"><StarPicker value={rating} onChange={setRating} /></div>
        </div>

        <div className="mt-5">
          <label className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Title</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            maxLength={120} placeholder="Sum up your experience"
            className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-4 text-[15px] outline-none focus:border-sun-500"
          />
        </div>

        <div className="mt-5">
          <label className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Your review</label>
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            maxLength={2000} rows={5} placeholder="What stood out? How was the communication, the shoot, the delivery?"
            className="mt-2 w-full rounded-xl border border-line bg-white p-4 text-[15px] outline-none focus:border-sun-500"
          />
        </div>

        {err && <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <SunButton type="button" variant="secondary" onClick={onClose}>Cancel</SunButton>
          <SunButton type="submit" disabled={busy}>{busy ? "Posting…" : "Post review"}</SunButton>
        </div>
      </form>
    </div>
  );
}
