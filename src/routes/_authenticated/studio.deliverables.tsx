import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio/deliverables")({
  head: () => ({ meta: [{ title: "Deliverables — PhotoLancer Studio" }] }),
  component: DeliverablesPage,
});

interface Row {
  booking: { id: string; event_date: string | null; amount: number | null; delivery_status: string; profiles: { full_name: string | null } | null };
  milestones: Array<{ id: string; title: string; due_date: string | null; status: string; is_final: boolean }>;
}

function DeliverablesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ph } = await supabase
        .from("photographers").select("id").eq("profile_id", user.id).maybeSingle();
      if (!ph) { setLoading(false); return; }
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, event_date, amount, delivery_status, profiles:customer_id(full_name)")
        .eq("photographer_id", ph.id)
        .in("status", ["confirmed", "completed"])
        .in("delivery_status", ["not_started", "in_progress", "disputed"])
        .order("event_date", { ascending: true });
      const ids = (bookings ?? []).map((b) => b.id);
      const { data: ms } = ids.length
        ? await supabase.from("delivery_milestones").select("id, booking_id, title, due_date, status, is_final, position").in("booking_id", ids).order("position", { ascending: true })
        : { data: [] as any[] };
      const grouped: Row[] = (bookings ?? []).map((b) => ({
        booking: b as any,
        milestones: (ms ?? []).filter((m: any) => m.booking_id === b.id) as any,
      }));
      setRows(grouped);
      setLoading(false);
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <StudioLayout title="Deliverables">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Deliverables</h1>
          <p className="mt-1 text-ink-muted">Manage milestones for bookings currently in the delivery phase.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 text-ink-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-sun-50/40 p-10 text-center text-ink-muted">
          <Package className="mx-auto h-8 w-8 text-sun-600" />
          <p className="mt-3 font-display text-lg font-extrabold text-ink">Nothing to deliver right now</p>
          <p className="text-sm">Once a booking is paid and the event happens, delivery milestones will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map(({ booking, milestones }) => {
            const overdue = milestones.some((m) => m.status === "pending" && m.due_date && m.due_date < today);
            const disputed = booking.delivery_status === "disputed";
            return (
              <Link key={booking.id} to="/bookings/$id" params={{ id: booking.id }}
                className={cn("block rounded-3xl border bg-white p-5 shadow-soft transition hover:border-sun-300",
                  disputed ? "border-red-200" : overdue ? "border-amber-200" : "border-line")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-lg font-extrabold text-ink">{booking.profiles?.full_name ?? "Customer"}</div>
                    <div className="text-[13px] text-ink-muted">Event: {booking.event_date ?? "—"} · {inr(booking.amount)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {disputed && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700"><AlertTriangle className="h-3 w-3" /> Disputed</span>}
                    {overdue && !disputed && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800"><Clock className="h-3 w-3" /> Overdue</span>}
                    <ArrowRight className="h-4 w-4 text-sun-700" />
                  </div>
                </div>
                <ol className="mt-4 grid gap-2 sm:grid-cols-3">
                  {milestones.map((m) => {
                    const isOverdue = m.status === "pending" && m.due_date && m.due_date < today;
                    return (
                      <li key={m.id} className="rounded-xl border border-line bg-sun-50/30 p-3">
                        <div className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{m.is_final ? "Final · " : ""}{m.status}</div>
                        <div className="mt-0.5 truncate font-semibold text-ink">{m.title}</div>
                        <div className={cn("text-[11px]", isOverdue ? "text-red-700 font-bold" : "text-ink-muted")}>Due {m.due_date ?? "—"}</div>
                      </li>
                    );
                  })}
                </ol>
              </Link>
            );
          })}
        </div>
      )}
    </StudioLayout>
  );
}
