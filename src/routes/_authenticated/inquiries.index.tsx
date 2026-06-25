import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { CustomerLayout } from "@/components/sun/CustomerLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/inquiries/")({
  head: () => ({ meta: [{ title: "Your inquiries — PhotoLancer" }] }),
  component: InquiriesPage,
});

interface Row {
  id: string;
  status: string;
  event_type: string | null;
  event_date: string | null;
  budget: number | null;
  created_at: string;
  photographers: { business_name: string; slug: string } | null;
}

const flowLabel: Record<string, string> = {
  new: "Requested",
  quoted: "Quoted",
  accepted: "Booked",
  declined: "Declined",
  expired: "Expired",
};
const statusStyle: Record<string, string> = {
  new: "bg-sun-50 text-sun-700",
  quoted: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-zinc-100 text-zinc-700",
};

function InquiriesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inquiries")
      .select("id, status, event_type, event_date, budget, created_at, photographers(business_name, slug)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as unknown as Row[]); setLoading(false); });
  }, [user]);

  return (
    <CustomerLayout title="Inquiries">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Your inquiries</h1>
          <p className="mt-1 text-ink-muted">Requested → Quoted → Booked.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 text-ink-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <MessageSquare className="h-8 w-8 text-sun-600" />
          <h2 className="font-display text-xl font-extrabold text-ink">No inquiries yet</h2>
          <p className="text-ink-muted">Browse photographers and request your first quote.</p>
          <Link to="/search" className="mt-2"><SunButton>Find a photographer</SunButton></Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              to="/inquiries/$id"
              params={{ id: r.id }}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sun-300 hover:shadow-warm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold text-ink">{r.photographers?.business_name ?? "—"}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusStyle[r.status] ?? ""}`}>{flowLabel[r.status] ?? r.status}</span>
                </div>
                <div className="mt-1 text-[13px] text-ink-muted">
                  {r.event_type ?? "—"} · {r.event_date ?? "no date"} · budget {inr(r.budget)}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-ink-muted" />
            </Link>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
