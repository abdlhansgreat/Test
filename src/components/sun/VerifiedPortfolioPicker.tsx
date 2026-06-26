import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, Check, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SunButton } from "@/components/sun/SunButton";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  thumbnail_url: string | null;
  media_url: string | null;
  caption: string | null;
  verified: boolean;
  verified_booking_id: string | null;
}

/** Shown to the photographer on a delivered booking so they can mark which
 * portfolio items were shot on this specific booking — earning the "Verified
 * Work" badge for those images. */
export function VerifiedPortfolioPicker({
  bookingId,
  photographerId,
}: {
  bookingId: string;
  photographerId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  const load = async () => {
    const { data } = await supabase
      .from("portfolio_items")
      .select("id, thumbnail_url, media_url, caption, verified, verified_booking_id")
      .eq("photographer_id", photographerId)
      .order("position", { ascending: true })
      .limit(60);
    const its = (data ?? []) as unknown as Item[];
    setItems(its);
    const map: Record<string, string | null> = {};
    await Promise.all(
      its.map(async (i) => {
        map[i.id] = await resolveMediaUrl(i.thumbnail_url ?? i.media_url, "portfolio");
      }),
    );
    setUrls(map);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photographerId, bookingId]);

  const toggle = async (it: Item) => {
    const isMine = it.verified && it.verified_booking_id === bookingId;
    setSaving(it.id);
    if (isMine) {
      await supabase
        .from("portfolio_items")
        .update({ verified: false, verified_booking_id: null, verified_at: null })
        .eq("id", it.id);
    } else {
      await supabase
        .from("portfolio_items")
        .update({
          verified: true,
          verified_booking_id: bookingId,
          verified_at: new Date().toISOString(),
        })
        .eq("id", it.id);
    }
    setSaving(null);
    await load();
  };

  const linkedCount = items.filter((i) => i.verified && i.verified_booking_id === bookingId).length;

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
            <BadgeCheck className="h-5 w-5 text-sun-700" /> Add to your Verified Portfolio
          </h2>
          <p className="mt-1 max-w-prose text-[13px] text-ink-muted">
            Tap any portfolio image you actually shot on this booking. We'll show a
            <span className="mx-1 inline-flex items-center gap-1 align-middle rounded-full bg-sun-50 px-2 py-0.5 text-[11px] font-bold text-sun-700"><BadgeCheck className="h-3 w-3" /> Verified Work</span>
            badge on those images so clients know they're your real, delivered work.
          </p>
        </div>
        <span className="rounded-full bg-sun-50 px-3 py-1 text-[12px] font-bold text-sun-700">
          {linkedCount} linked to this booking
        </span>
      </div>

      {loading ? (
        <div className="mt-6 text-ink-muted">Loading portfolio…</div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-sun-50/40 p-8 text-center text-ink-muted">
          <ImageOff className="mx-auto h-6 w-6" />
          <p className="mt-2 text-sm">You don't have portfolio items yet. Upload the photos from this booking on your portfolio page first, then come back to mark them as Verified Work.</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((it) => {
            const isMine = it.verified && it.verified_booking_id === bookingId;
            const isOther = it.verified && !isMine;
            return (
              <button
                key={it.id}
                onClick={() => !isOther && toggle(it)}
                disabled={!!isOther || saving === it.id}
                title={isOther ? "Already linked to another booking" : isMine ? "Linked — click to remove" : "Mark as shot on this booking"}
                className={cn(
                  "relative overflow-hidden rounded-xl border bg-sun-50 transition disabled:cursor-not-allowed",
                  isMine ? "border-sun-500 ring-2 ring-sun-300" : "border-line hover:border-sun-300",
                  isOther && "opacity-60",
                )}
              >
                <div className="aspect-square w-full">
                  {urls[it.id] ? (
                    <img src={urls[it.id]!} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-muted">
                      <ImageOff className="h-4 w-4" />
                    </div>
                  )}
                </div>
                {(isMine || isOther) && (
                  <span className={cn(
                    "absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-soft",
                    isMine ? "bg-sun-600" : "bg-ink/70",
                  )}>
                    {saving === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isMine ? <Check className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
