import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, ArrowRight, CalendarCheck } from "lucide-react";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/studio/bookings")({
  head: () => ({ meta: [{ title: "Bookings — PhotoLancer Studio" }] }),
  component: BookingsPage,
});

interface Row {
  id: string;
  event_date: string | null;
  event_type: string | null;
  amount: number | null;
  commission_amount: number | null;
  status: string;
  escrow_status: string;
  profiles: { full_name: string | null } | null;
}

const tone: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  confirmed: "bg-green-50 text-green-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-700",
  refunded: "bg-orange-50 text-orange-700",
};

function BookingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ph } = await supabase
        .from("photographers").select("id").eq("profile_id", user.id).maybeSingle();
      if (!ph) { setLoading(false); return; }
      const { data } = await supabase
        .from("bookings")
        .select("id, event_date, event_type, amount, commission_amount, status, escrow_status, profiles!bookings_customer_id_fkey(full_name)")
        .eq("photographer_id", ph.id)
        .order("event_date", { ascending: false });
      setRows((data ?? []) as unknown as Row[]);
      setLoading(false);
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => (r.event_date ?? "") >= today && r.status === "confirmed");
  const past = rows.filter((r) => !((r.event_date ?? "") >= today && r.status === "confirmed"));

  return (
    <StudioLayout title="Bookings">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Bookings</h1>
          <p className="mt-1 text-ink-muted">Manage upcoming events and review past work.</p>
        </div>
      </div>

      {loading ? <div className="mt-8 text-ink-muted">Loading…</div> : (
        <>
          <Section title="Upcoming">
            {upcoming.length === 0 ? <Empty msg="No upcoming confirmed bookings yet." /> : upcoming.map((r) => <Row key={r.id} r={r} />)}
          </Section>
          <Section title="Past & other">
            {past.length === 0 ? <Empty msg="No past bookings yet." /> : past.map((r) => <Row key={r.id} r={r} />)}
          </Section>
        </>
      )}
    </StudioLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Row({ r }: { r: Row }) {
  const net = (r.amount ?? 0) - (r.commission_amount ?? 0);
  return (
    <Link
      to="/bookings/$id"
      params={{ id: r.id }}
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sun-300 hover:shadow-warm"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold text-ink">{r.profiles?.full_name ?? "Customer"}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${tone[r.status] ?? ""}`}>{r.status}</span>
          <span className="rounded-full bg-sun-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-sun-700">escrow {r.escrow_status}</span>
        </div>
        <div className="mt-1 text-[13px] text-ink-muted">
          <Calendar className="-mt-0.5 mr-1 inline h-3 w-3" />
          {r.event_date ?? "no date"} · {r.event_type ?? "event"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-display text-lg font-extrabold text-ink">{inr(net)}</div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">net payout</div>
        </div>
        <ArrowRight className="h-5 w-5 text-ink-muted" />
      </div>
    </Link>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
      <CalendarCheck className="h-7 w-7 text-sun-600" />
      <div className="text-sm text-ink-muted">{msg}</div>
    </div>
  );
}
