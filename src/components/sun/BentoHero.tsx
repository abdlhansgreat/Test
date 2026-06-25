import { useEffect, useState } from "react";
import { BadgeCheck, Star, MapPin } from "lucide-react";
import { pickStock, loadOverrides, getOverride, StockImage } from "@/lib/stock-images";

function resolveSlot(slot: string, fallback: StockImage): StockImage {
  const o = getOverride(slot);
  if (!o) return fallback;
  return { url: o.url, thumb: o.thumb || o.url, alt: o.alt || fallback.alt, credit: o.credit || "", source: "unsplash" };
}

export function BentoHero() {
  const [, tick] = useState(0);
  useEffect(() => { loadOverrides().then(() => tick((t) => t + 1)); }, []);

  const main = resolveSlot("hero:main", pickStock("wedding", 0));
  const dusk = resolveSlot("hero:dusk", pickStock("pre-wedding", 1));
  const rose = resolveSlot("hero:rose", pickStock("fashion", 0));
  const portrait = resolveSlot("hero:portrait", pickStock("bride", 0));

  return (
    <div className="relative h-[520px] w-full max-w-[560px] md:h-[600px]">
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-3">
        <div className="col-span-3 row-span-6 overflow-hidden rounded-3xl shadow-soft animate-rise" style={{ animationDelay: "0.05s" }}>
          <img src={main.url} alt={main.alt} loading="eager" className="h-full w-full object-cover" />
        </div>
        <div className="col-span-3 row-span-3 overflow-hidden rounded-3xl shadow-soft animate-rise" style={{ animationDelay: "0.15s" }}>
          <img src={dusk.url} alt={dusk.alt} loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div className="col-span-3 row-span-3 overflow-hidden rounded-3xl shadow-soft animate-rise" style={{ animationDelay: "0.25s" }}>
          <img src={rose.url} alt={rose.alt} loading="lazy" className="h-full w-full object-cover" />
        </div>
      </div>

      <div className="absolute left-[-12px] top-[34%] animate-float">
        <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-warm">
          <Star className="h-4 w-4 fill-sun-300 text-sun-300" />
          <span className="font-display text-sm font-bold text-ink">4.9</span>
          <span className="text-xs text-ink-muted">avg rating</span>
        </div>
      </div>

      <div className="absolute right-[-10px] top-[10%] animate-float-slow">
        <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-warm">
          <BadgeCheck className="h-4 w-4 text-success" />
          <span className="text-xs font-bold text-ink">Verified</span>
        </div>
      </div>

      <div className="absolute right-[8%] top-[46%] animate-float">
        <div className="rounded-2xl bg-white px-4 py-2.5 shadow-warm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Booked this month</div>
          <div className="font-display text-base font-extrabold text-ink">₹1.4L+</div>
        </div>
      </div>

      <div className="absolute left-[-8%] bottom-[6%] w-[260px] animate-float-slow">
        <div className="rounded-2xl border border-line bg-white p-3.5 shadow-warm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-primary">
              <img src={portrait.url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[15px] font-bold text-ink truncate">Saat Phere Studios</div>
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-live pulse-dot" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
                </span>
                Available for second shoots
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-[-4%] bottom-[2%] animate-float">
        <div className="flex items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-white shadow-warm">
          <MapPin className="h-4 w-4 text-sun-300" />
          <div>
            <div className="font-display text-sm font-extrabold">60+ cities</div>
            <div className="text-[10px] text-white/70">across India</div>
          </div>
        </div>
      </div>
    </div>
  );
}
