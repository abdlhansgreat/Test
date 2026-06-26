import { Heart, MapPin, MessageCircle, Star, BadgeCheck, Trash2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SunButton } from "./SunButton";
import { useAuth } from "@/lib/auth-context";
import { toggleSaved } from "@/lib/saved";
import { findOrCreateConversation } from "@/lib/messaging";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotographerCardProps {
  name: string;
  city: string;
  rating: number;
  reviews: number;
  fromPrice: string;
  genres: string[];
  badge?: "verified" | "second-shoots" | "top-rated";
  respondsIn?: string;
  tileClass?: string;
  photographerId?: string;
  slug?: string;
  initialSaved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  showRemove?: boolean;
  onRemove?: () => void;
  isFeatured?: boolean;
  coverUrl?: string | null;
}


const badgeMap = {
  verified: { label: "Community Verified", className: "bg-success text-white" },
  "second-shoots": { label: "Available for second shoots", className: "bg-gradient-primary text-white" },
  "top-rated": { label: "Top rated", className: "bg-sun-300 text-ink" },
};

export function PhotographerCard({
  name, city, rating, reviews, fromPrice, genres,
  badge = "verified", respondsIn = "responds in ~2h", tileClass = "tile-warm",
  photographerId, slug, initialSaved = false, onSavedChange, showRemove, onRemove,
  isFeatured, coverUrl,
}: PhotographerCardProps) {

  const b = badgeMap[badge];
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setSaved(initialSaved); }, [initialSaved]);

  const handleHeart = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!photographerId) return;
    if (!user) { toast("Sign in to save"); navigate({ to: "/auth" }); return; }
    setBusy(true);
    try {
      const next = await toggleSaved(user.id, photographerId, saved);
      setSaved(next); onSavedChange?.(next);
    } catch (err) {
      toast.error((err as Error).message ?? "Couldn't save");
    } finally { setBusy(false); }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!photographerId) return;
    const { data: p } = await supabase.from("photographers").select("profile_id").eq("id", photographerId).maybeSingle();
    if (!p) return;
    const convId = await findOrCreateConversation(p.profile_id);
    navigate({ to: "/messages/$conversationId", params: { conversationId: convId } });
  };

  const inner = (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-warm">
      <div className={cn("relative aspect-[16/11] w-full overflow-hidden", !coverUrl && tileClass)}>
        {coverUrl && (
          <img
            src={coverUrl}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {coverUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />}

        <span className={cn("absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide", b.className)}>
          <BadgeCheck className="h-3.5 w-3.5" />
          {b.label}
        </span>
        {isFeatured && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-soft">
            <Sparkles className="h-3 w-3" /> Featured
          </span>
        )}
        <button
          type="button"
          aria-label={saved ? "Unsave" : "Save"}
          disabled={busy}
          onClick={handleHeart}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-soft backdrop-blur transition hover:bg-white hover:text-sun-600 disabled:opacity-60"
        >
          <Heart className={cn("h-4 w-4 transition", saved && "fill-sun-600 text-sun-600")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-display text-[19px] font-bold leading-tight text-ink">{name}</h4>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-sun-300 text-sun-300" />
            <span className="font-bold text-ink">{rating.toFixed(1)}</span>
            <span className="text-ink-muted">({reviews})</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="h-3.5 w-3.5" /> {city}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <span key={g} className="rounded-full bg-sun-50 px-2.5 py-1 text-[11px] font-semibold text-ink">{g}</span>
          ))}
        </div>

        <div className="my-1 border-t border-line" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">From</div>
            <div className="font-display text-lg font-extrabold text-ink">{fromPrice}</div>
          </div>
          <div className="flex items-center gap-2">
            {showRemove && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove?.(); }}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-muted transition hover:border-sun-300 hover:text-sun-700"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
            <SunButton variant="secondary" size="sm" onClick={photographerId ? handleMessage : undefined}>
              <MessageCircle className="h-4 w-4" /> Message
            </SunButton>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-ink-muted">{respondsIn}</div>
      </div>
    </article>
  );

  if (slug) {
    return (
      <Link to="/p/$slug" params={{ slug }} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}
