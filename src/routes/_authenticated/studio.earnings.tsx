import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, ShieldCheck, Calendar } from "lucide-react";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/studio/earnings")({
  head: () => ({ meta: [{ title: "Earnings — PhotoLancer Studio" }] }),
  component: EarningsPage,
});

interface Row {
  id: string;
  event_date: string | null;
  amount: number | null;
  commission_amount: number | null;
  status: string;
  escrow_status: string;
  profiles: { full_name: string | null } | null;
}

function EarningsPage() {
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
        .select("id, event_date, amount, commission_amount, status, escrow_status, profiles!bookings_customer_id_fkey(full_name)")
        .eq("photographer_id", ph.id)
        .in("status", ["confirmed", "completed"])
        .order("event_date", { ascending: false });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, [user]);

  const totals = rows.reduce((acc, r) => {
    const net = (r.amount ?? 0) - (r.commission_amount ?? 0);
    acc.gross += r.amount ?? 0;
    acc.commission += r.commission_amount ?? 0;
    if (r.escrow_status === "held") acc.held += net;
    if (r.escrow_status === "released") acc.released += net;
    return acc;
  }, { gross: 0, commission: 0, held: 0, released: 0 });

  const upcoming = rows.filter((r) => r.status === "confirmed");
  const past = rows.filter((r) => r.status === "completed");

  return (
    <StudioLayout title="Earnings">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Earnings</h1>
          <p className="mt-1 text-ink-muted">Payment is held in escrow until the customer approves the final delivery, then released to you.</p>
        </div>
      </div>

        {loading ? <div className="mt-8 text-ink-muted">Loading…</div> : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <Stat icon={<ShieldCheck className="h-5 w-5" />} label="Held until delivery" value={inr(totals.held)} />
              <Stat icon={<Wallet className="h-5 w-5" />} label="Released" value={inr(totals.released)} />
              <Stat icon={<TrendingUp className="h-5 w-5" />} label="Gross bookings" value={inr(totals.gross)} />
              <Stat icon={<TrendingUp className="h-5 w-5" />} label="Commission paid" value={inr(totals.commission)} />
            </div>

            <Section title="Upcoming events">
              {upcoming.length === 0 ? (
                <Empty msg="No upcoming confirmed bookings." />
              ) : upcoming.map((r) => <BookingRow key={r.id} r={r} />)}
            </Section>

            <Section title="Past events">
              {past.length === 0 ? <Empty msg="No completed bookings yet." /> : past.map((r) => <BookingRow key={r.id} r={r} />)}
            </Section>
          </>
        )}
    </StudioLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-50 text-sun-700">{icon}</div>
      <div className="mt-3 font-display text-2xl font-extrabold text-ink">{value}</div>
      <div className="text-[12px] font-semibold text-ink-muted">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-extrabold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function BookingRow({ r }: { r: Row }) {
  const net = (r.amount ?? 0) - (r.commission_amount ?? 0);
  return (
    <Link
      to="/bookings/$id"
      params={{ id: r.id }}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft hover:border-sun-300"
    >
      <div>
        <div className="font-display text-base font-bold text-ink">{r.profiles?.full_name ?? "Customer"}</div>
        <div className="text-[13px] text-ink-muted">
          <Calendar className="-mt-0.5 mr-1 inline h-3 w-3" />
          {r.event_date ?? "no date"} · escrow {r.escrow_status}
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-lg font-extrabold text-ink">{inr(net)}</div>
        <div className="text-[11px] uppercase tracking-wide text-ink-muted">net payout</div>
      </div>
    </Link>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-ink-muted">{msg}</div>;
}
