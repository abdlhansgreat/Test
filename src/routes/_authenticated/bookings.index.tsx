import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, ArrowRight, CalendarCheck, Star } from "lucide-react";
import { CustomerLayout } from "@/components/sun/CustomerLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/bookings/")({
  head: () => ({ meta: [{ title: "Your bookings — PhotoLancer" }] }),
  component: BookingsListPage,
});

interface Row {
  id: string;
  event_date: string | null;
  event_type: string | null;
  amount: number | null;
  status: string;
  escrow_status: string;
  photographers: { business_name: string; slug: string } | null;
}

const tone: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  confirmed: "bg-green-50 text-green-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-700",
  refunded: "bg-orange-50 text-orange-700",
};

function BookingsListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, event_date, event_type, amount, status, escrow_status, photographers(business_name, slug)")
        .eq("customer_id", user.id)
        .order("event_date", { ascending: false });
      const list = (data ?? []) as unknown as Row[];
      setRows(list);
      const completed = list.filter((r) => r.status === "completed").map((r) => r.id);
      if (completed.length) {
        const { data: rv } = await supabase.from("reviews").select("booking_id").in("booking_id", completed);
        setReviewedIds(new Set((rv ?? []).map((r) => r.booking_id as string)));
      }
      setLoading(false);
    })();
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => r.status === "confirmed" && (r.event_date ?? "") >= today);
  const past = rows.filter((r) => !(r.status === "confirmed" && (r.event_date ?? "") >= today));

  return (
    <CustomerLayout title="Bookings">
      <h1 className="font-display text-3xl font-extrabold text-ink">Your bookings</h1>
      <p className="mt-1 text-ink-muted">Upcoming events and past shoots.</p>

      {loading ? <div className="mt-8 text-ink-muted">Loading…</div> : (
        <>
          <Section title="Upcoming">
            {upcoming.length === 0 ? (
              <Empty msg="No upcoming bookings — once you confirm a quote, your booking shows here." />
            ) : upcoming.map((r) => <RowItem key={r.id} r={r} reviewed={reviewedIds.has(r.id)} />)}
          </Section>
          <Section title="Past">
            {past.length === 0 ? (
              <Empty msg="No past bookings yet." />
            ) : past.map((r) => <RowItem key={r.id} r={r} reviewed={reviewedIds.has(r.id)} />)}
          </Section>
        </>
      )}
    </CustomerLayout>
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

function RowItem({ r, reviewed }: { r: Row; reviewed: boolean }) {
  return (
    <Link
      to="/bookings/$id"
      params={{ id: r.id }}
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sun-300 hover:shadow-warm"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold text-ink">{r.photographers?.business_name ?? "—"}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${tone[r.status] ?? ""}`}>{r.status}</span>
          <span className="rounded-full bg-sun-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-sun-700">escrow {r.escrow_status}</span>
          {r.status === "completed" && !reviewed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-0.5 text-[11px] font-bold uppercase text-white">
              <Star className="h-3 w-3" /> Leave a review
            </span>
          )}
        </div>
        <div className="mt-1 text-[13px] text-ink-muted">
          <Calendar className="-mt-0.5 mr-1 inline h-3 w-3" />
          {r.event_date ?? "no date"} · {r.event_type ?? "event"}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-display text-lg font-extrabold text-ink">{inr(r.amount)}</div>
          <div className="text-[11px] uppercase tracking-wide text-ink-muted">total</div>
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
      <Link to="/search" className="mt-2"><SunButton variant="secondary">Browse photographers</SunButton></Link>
    </div>
  );
}
