import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import type { KindFilter } from "@/lib/photographer-search";

export interface FiltersValue {
  genres: string[];
  kind: KindFilter;
  budget: string; // "0-50000", "50000-100000", etc., or ""
  date?: string;
  verified: boolean;
  secondshoots: boolean;
  rating?: number;
}

export const BUDGETS = [
  { value: "", label: "Any" },
  { value: "0-50000", label: "Under ₹50,000" },
  { value: "50000-100000", label: "₹50,000 – ₹1,00,000" },
  { value: "100000-200000", label: "₹1,00,000 – ₹2,00,000" },
  { value: "200000-", label: "₹2,00,000+" },
];

interface Props {
  value: FiltersValue;
  onChange: (next: FiltersValue) => void;
  onApply?: () => void;
  onClear: () => void;
}

export function SearchFilters({ value, onChange, onApply, onClear }: Props) {
  const [genres, setGenres] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    supabase
      .from("genres")
      .select("slug, name")
      .order("name")
      .then(({ data }) => setGenres(data ?? []));
  }, []);

  const toggleGenre = (slug: string) => {
    const set = new Set(value.genres);
    set.has(slug) ? set.delete(slug) : set.add(slug);
    onChange({ ...value, genres: [...set] });
  };

  return (
    <div className="flex flex-col gap-7">
      <FilterBlock title="Photography type">
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => {
            const active = value.genres.includes(g.slug);
            return (
              <button
                key={g.slug}
                type="button"
                onClick={() => toggleGenre(g.slug)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-bold transition",
                  active
                    ? "border-sun-600 bg-gradient-primary text-white shadow-soft"
                    : "border-line bg-white text-ink hover:border-sun-300 hover:bg-sun-50",
                )}
              >
                {g.name}
              </button>
            );
          })}
          {genres.length === 0 && (
            <div className="text-xs text-ink-muted">Loading genres…</div>
          )}
        </div>
      </FilterBlock>

      <FilterBlock title="Hire type">
        <div className="inline-flex rounded-full border border-line bg-white p-1">
          {([
            { v: "both", l: "Both" },
            { v: "studio", l: "Studio" },
            { v: "freelancer", l: "Freelancer" },
          ] as { v: KindFilter; l: string }[]).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange({ ...value, kind: opt.v })}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12px] font-bold transition",
                value.kind === opt.v
                  ? "bg-gradient-primary text-white shadow-soft"
                  : "text-ink hover:text-sun-700",
              )}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Budget per event">
        <div className="flex flex-col gap-2">
          {BUDGETS.map((b) => (
            <label key={b.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="budget"
                className="accent-sun-600"
                checked={value.budget === b.value}
                onChange={() => onChange({ ...value, budget: b.value })}
              />
              {b.label}
            </label>
          ))}
        </div>
      </FilterBlock>

      <FilterBlock title="Availability">
        <div className="rounded-2xl border border-line bg-white p-2">
          <Calendar
            mode="single"
            selected={value.date ? new Date(value.date) : undefined}
            onSelect={(d) =>
              onChange({
                ...value,
                date: d ? d.toISOString().slice(0, 10) : undefined,
              })
            }
            className="pointer-events-auto"
          />
        </div>
      </FilterBlock>

      <FilterBlock title="Trust">
        <Toggle
          label="Community Verified only"
          checked={value.verified}
          onChange={(b) => onChange({ ...value, verified: b })}
        />
        <Toggle
          label="Available for second shoots"
          checked={value.secondshoots}
          onChange={(b) => onChange({ ...value, secondshoots: b })}
        />
      </FilterBlock>

      <FilterBlock title="Minimum rating">
        <div className="flex flex-wrap gap-2">
          {[undefined, 4.0, 4.5].map((r) => {
            const active = value.rating === r;
            const label = r === undefined ? "Any" : `${r.toFixed(1)}+`;
            return (
              <button
                key={String(r)}
                type="button"
                onClick={() => onChange({ ...value, rating: r })}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-bold transition",
                  active
                    ? "border-sun-600 bg-gradient-primary text-white"
                    : "border-line bg-white text-ink hover:border-sun-300",
                )}
              >
                {r !== undefined && <Star className="h-3 w-3 fill-current" />}
                {label}
              </button>
            );
          })}
        </div>
      </FilterBlock>

      <div className="flex gap-2 pt-2">
        {onApply && (
          <button
            type="button"
            onClick={onApply}
            className="flex-1 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft"
          >
            Apply filters
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink hover:border-sun-300"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-ink">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full transition",
          checked ? "bg-gradient-primary" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}
