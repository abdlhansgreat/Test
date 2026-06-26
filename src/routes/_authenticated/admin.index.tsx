import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Camera, Wallet, TrendingUp, Loader2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview — PhotoLancer" }] }),
  component: AdminOverview,
});

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">{label}</span>
        <Icon className="h-4 w-4 text-sun-600" />
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold text-ink">{value}</div>
    </div>
  );
}

function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ photographers: 0, customers: 0, bookings: 0, gmv: 0, commission: 0, escrow: 0, released: 0 });
  const [series, setSeries] = useState<{ month: string; gmv: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [pCount, cCount, bAll] = await Promise.all([
        supabase.from("photographers").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
        supabase.from("bookings").select("amount, commission_amount, escrow_status, status, created_at"),
      ]);
      const rows = bAll.data ?? [];
      const gmv = rows.reduce((s, b: any) => s + Number(b.amount ?? 0), 0);
      const commission = rows.filter((b: any) => b.status !== "cancelled").reduce((s, b: any) => s + Number(b.commission_amount ?? 0), 0);
      const escrow = rows.filter((b: any) => b.escrow_status === "held").reduce((s, b: any) => s + Number(b.amount ?? 0), 0);
      const released = rows.filter((b: any) => b.escrow_status === "released").reduce((s, b: any) => s + Number(b.amount ?? 0), 0);

      // last 6 months GMV
      const now = new Date();
      const buckets: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets[d.toISOString().slice(0, 7)] = 0;
      }
      for (const b of rows) {
        const k = (b.created_at as string).slice(0, 7);
        if (k in buckets) buckets[k] += Number(b.amount ?? 0);
      }
      setSeries(Object.entries(buckets).map(([month, gmv]) => ({
        month: new Date(month + "-01").toLocaleString(undefined, { month: "short" }),
        gmv,
      })));

      setStats({
        photographers: pCount.count ?? 0,
        customers: cCount.count ?? 0,
        bookings: rows.length,
        gmv, commission, escrow, released,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <AdminLayout title="Overview">
      {loading ? (
        <div className="flex items-center justify-center p-16 text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Photographers" value={String(stats.photographers)} icon={Camera} />
            <StatCard label="Customers" value={String(stats.customers)} icon={Users} />
            <StatCard label="Bookings" value={String(stats.bookings)} icon={TrendingUp} />
            <StatCard label="GMV" value={inr(stats.gmv)} icon={Wallet} />
            <StatCard label="Commission earned" value={inr(stats.commission)} icon={Wallet} />
            <StatCard label="In escrow" value={inr(stats.escrow)} icon={Wallet} />
            <StatCard label="Released" value={inr(stats.released)} icon={Wallet} />
          </div>

          <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-extrabold text-ink">GMV by month</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3eadb" />
                  <XAxis dataKey="month" stroke="#9b8b76" fontSize={12} />
                  <YAxis stroke="#9b8b76" fontSize={12} />
                  <Tooltip cursor={{ fill: "#fff6e6" }} contentStyle={{ borderRadius: 12, border: "1px solid #f0e3cb" }} />
                  <Bar dataKey="gmv" fill="#FF7A1A" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
