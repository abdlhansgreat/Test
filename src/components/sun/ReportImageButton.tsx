import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SunButton } from "@/components/sun/SunButton";

const REASONS = [
  "Not the photographer's own work",
  "Stolen or reposted from elsewhere",
  "Misleading or staged stock photo",
  "Other",
];

export function ReportImageButton({
  portfolioItemId,
  reporterId,
}: {
  portfolioItemId: string;
  reporterId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!reporterId) { setErr("Please sign in to report."); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from("portfolio_reports").insert({
      portfolio_item_id: portfolioItemId,
      reporter_id: reporterId,
      reason: details.trim() ? `${reason} — ${details.trim()}` : reason,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setDetails(""); }, 1400);
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-white"
        title="Report this image"
      >
        <Flag className="h-3 w-3" /> Report
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-warm">
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-extrabold text-ink">Report this image</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-muted hover:text-ink"><X className="h-5 w-5" /></button>
            </div>
            {done ? (
              <p className="mt-4 rounded-xl bg-green-50 px-3 py-3 text-sm font-semibold text-green-800">
                Thanks — our moderation team will review this.
              </p>
            ) : (
              <>
                <p className="mt-2 text-[13px] text-ink-muted">
                  Help us keep portfolios honest. Reports are reviewed by our team and never shared with the photographer.
                </p>
                <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-sun-500">
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Details (optional)</label>
                <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3}
                  placeholder="Link to original source, context, etc."
                  className="mt-1 w-full rounded-xl border border-line bg-white p-3 outline-none focus:border-sun-500" />
                {err && <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
                <div className="mt-4 flex justify-end gap-2">
                  <SunButton variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</SunButton>
                  <SunButton size="sm" onClick={submit} disabled={busy}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />} Submit report
                  </SunButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
