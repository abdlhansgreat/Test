import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/studio/availability")({
  head: () => ({ meta: [{ title: "Calendar — PhotoLancer Studio" }] }),
  component: AvailabilityPage,
});

type Status = "available" | "blocked" | "booked";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function AvailabilityPage() {
  const { user } = useAuth();
  const [photogId, setPhotogId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ph } = await supabase
        .from("photographers").select("id").eq("profile_id", user.id).maybeSingle();
      if (!ph) { setLoading(false); return; }
      setPhotogId(ph.id);
    })();
  }, [user]);

  useEffect(() => {
    if (!photogId) return;
    (async () => {
      setLoading(true);
      const start = ymd(cursor);
      const endDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const end = ymd(endDate);

      const [{ data: av }, { data: bk }] = await Promise.all([
        supabase.from("availability").select("date, status").eq("photographer_id", photogId).gte("date", start).lte("date", end),
        supabase.from("bookings").select("event_date").eq("photographer_id", photogId).eq("status", "confirmed").gte("event_date", start).lte("event_date", end),
      ]);

      const map: Record<string, Status> = {};
      for (const r of av ?? []) {
        if (r.date) map[r.date] = (r.status as Status) ?? "available";
      }
      for (const b of bk ?? []) {
        if (b.event_date) map[b.event_date] = "booked";
      }
      setStatuses(map);
      setLoading(false);
    })();
  }, [photogId, cursor]);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const startWeekday = first.getDay(); // 0=Sun
    const total = last.getDate();
    const cells: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= total; d++) {
      const dt = new Date(cursor.getFullYear(), cursor.getMonth(), d);
      cells.push({ date: dt, key: ymd(dt) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `pad-end-${cells.length}` });
    return cells;
  }, [cursor]);

  const toggleDay = async (date: Date) => {
    if (!photogId) return;
    const key = ymd(date);
    const current = statuses[key] ?? "available";
    if (current === "booked") return;
    const next: Status = current === "available" ? "blocked" : "available";
    setSaving(key);
    setStatuses((s) => ({ ...s, [key]: next }));
    const { error } = await supabase.from("availability").upsert(
      { photographer_id: photogId, date: key, status: next },
      { onConflict: "photographer_id,date" },
    );
    setSaving(null);
    if (error) {
      toast.error("Couldn't update day");
      setStatuses((s) => ({ ...s, [key]: current }));
    }
  };

  const monthLabel = cursor.toLocaleString("en", { month: "long", year: "numeric" });
  const today = ymd(new Date());

  return (
    <StudioLayout title="Calendar">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Availability</h1>
          <p className="mt-1 text-ink-muted">Tap a day to toggle available ↔ blocked. Confirmed bookings are locked.</p>
        </div>
        <Legend />
      </div>

      <div className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink hover:bg-sun-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="font-display text-lg font-extrabold text-ink">{monthLabel}</div>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink hover:bg-sun-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>

        {loading && !photogId ? (
          <div className="mt-6 text-center text-ink-muted">{photogId === null ? "Loading your calendar…" : ""}</div>
        ) : (
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {days.map((c) => {
              if (!c.date) return <div key={c.key} />;
              const key = c.key;
              const status = statuses[key] ?? "available";
              const isToday = key === today;
              const isPast = key < today;
              const tone = status === "booked"
                ? "bg-sun-600 text-white border-sun-700 cursor-not-allowed"
                : status === "blocked"
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink border-line hover:border-sun-300";
              return (
                <button
                  key={key}
                  disabled={status === "booked" || isPast || saving === key}
                  onClick={() => toggleDay(c.date!)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-bold transition ${tone} ${isPast && status !== "booked" ? "opacity-40" : ""}`}
                >
                  <span>{c.date.getDate()}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">
                    {status === "booked" ? "Booked" : status === "blocked" ? "Blocked" : ""}
                  </span>
                  {isToday && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sun-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-sun-50/40 p-4 text-[13px] text-ink-muted">
        <CalendarDays className="mt-0.5 h-4 w-4 text-sun-700" />
        <p>This calendar is used by the search date filter — clients only see you for dates you're available.</p>
      </div>
    </StudioLayout>
  );
}

function Legend() {
  const items: Array<{ label: string; cls: string }> = [
    { label: "Available", cls: "bg-white border border-line" },
    { label: "Blocked", cls: "bg-ink" },
    { label: "Booked", cls: "bg-sun-600" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded ${i.cls}`} /> {i.label}
        </span>
      ))}
    </div>
  );
}
