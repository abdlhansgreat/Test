import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Inbox, ArrowRight } from "lucide-react";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/studio/leads")({
  head: () => ({ meta: [{ title: "Leads — PhotoLancer Studio" }] }),
  component: LeadsPage,
});

interface Row {
  id: string;
  status: string;
  event_type: string | null;
  event_date: string | null;
  budget: number | null;
  city: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

const tone: Record<string, string> = {
  new: "bg-sun-50 text-sun-700",
  quoted: "bg-blue-50 text-blue-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-zinc-100 text-zinc-700",
};

function LeadsPage() {
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
        .from("inquiries")
        .select("id, status, event_type, event_date, budget, city, created_at, profiles!inquiries_customer_id_fkey(full_name)")
        .eq("photographer_id", ph.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, [user]);

  return (
    <StudioLayout title="Leads">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Leads &amp; inquiries</h1>
          <p className="mt-1 text-ink-muted">Free to receive — we never charge per lead.</p>
        </div>
      </div>

        {loading ? (
          <div className="mt-8 text-ink-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-line bg-white p-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-sun-600" />
            <h2 className="mt-3 font-display text-xl font-extrabold text-ink">No leads yet</h2>
            <p className="mt-1 text-ink-muted">When clients send inquiries, they'll appear here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {rows.map((r) => (
              <Link
                key={r.id}
                to="/inquiries/$id"
                params={{ id: r.id }}
                className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sun-300 hover:shadow-warm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-bold text-ink">{r.profiles?.full_name ?? "Customer"}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${tone[r.status] ?? ""}`}>{r.status}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-ink-muted">
                    {r.event_type ?? "—"} · {r.event_date ?? "no date"} · {r.city ?? "—"} · budget {inr(r.budget)}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-ink-muted" />
              </Link>
            ))}
          </div>
        )}
    </StudioLayout>
  );
}
