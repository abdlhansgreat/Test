import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Undo2 } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/booking-config";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  head: () => ({ meta: [{ title: "Bookings & Payouts — Admin" }] }),
  component: BookingsPage,
});

interface BRow {
  id: string; amount: number; commission_amount: number | null;
  status: string; escrow_status: string | null; delivery_status: string | null; event_date: string | null;
  payments?: { id: string; status: string }[];
  photographers?: { business_name: string } | null;
  profiles?: { full_name: string | null } | null;
}

function BookingsPage() {
  const [rows, setRows] = useState<BRow[]>([]);
  const [tab, setTab] = useState<"all" | "disputed">("all");

  const load = async () => {
    let q = supabase.from("bookings")
      .select(`id, amount, commission_amount, status, escrow_status, delivery_status, event_date,
        payments(id, status),
        photographers(business_name),
        profiles:customer_id(full_name)`)
      .order("created_at", { ascending: false }).limit(200);
    if (tab === "disputed") q = q.or("delivery_status.eq.disputed,status.eq.disputed");
    const { data } = await q;
    setRows((data ?? []) as unknown as BRow[]);
  };
  useEffect(() => { load(); }, [tab]);

  const release = async (b: BRow) => {
    await supabase.from("bookings").update({ escrow_status: "released" }).eq("id", b.id);
    toast.success("Escrow released"); load();
  };
  const refund = async (b: BRow) => {
    if (!confirm("Mark as refunded?")) return;
    await supabase.from("bookings").update({ escrow_status: "refunded", status: "cancelled" }).eq("id", b.id);
    if (b.payments && b.payments.length > 0) {
      await supabase.from("payments").update({ status: "refunded" }).eq("booking_id", b.id);
    }
    toast.success("Refunded"); load();
  };
  const dispute = async (b: BRow) => {
    await supabase.from("bookings").update({ status: "disputed" }).eq("id", b.id);
    toast("Flagged as disputed"); load();
  };

  return (
    <AdminLayout title="Bookings & Payouts">
      <div className="mb-4 flex gap-2">
        {(["all", "disputed"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${tab === t ? "bg-gradient-primary text-white" : "border border-line bg-white text-ink hover:border-sun-300"}`}>
            {t === "all" ? "All bookings" : "Disputed deliveries"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl border border-line bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-sun-50/60 text-left text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Photographer</th><th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Escrow</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold text-ink">{b.photographers?.business_name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{b.profiles?.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{b.event_date ? new Date(b.event_date).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 font-semibold">{inr(b.amount)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-sun-50 px-2 py-0.5 text-[11px] font-bold text-sun-700">{b.status}</span></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${b.delivery_status === "disputed" ? "bg-red-50 text-red-700" : b.delivery_status === "delivered" ? "bg-green-50 text-green-800" : "bg-ink/10 text-ink-muted"}`}>
                    {b.delivery_status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3"><span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold text-ink-muted">{b.escrow_status ?? "—"}</span></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => release(b)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300"><CheckCircle2 className="h-3 w-3" /> Release</button>
                    <button onClick={() => refund(b)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300"><Undo2 className="h-3 w-3" /> Refund</button>
                    <button onClick={() => dispute(b)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-error hover:border-error"><AlertTriangle className="h-3 w-3" /> Flag</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-muted">No bookings to show.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
