import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Download } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/subscribers")({
  head: () => ({ meta: [{ title: "Subscribers — Admin · PhotoLancer" }] }),
  component: AdminSubscribers,
});

interface Sub { id: string; email: string; created_at: string }

function AdminSubscribers() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("subscribers").select("id,email,created_at").order("created_at", { ascending: false }).limit(1000);
      setRows((data ?? []) as Sub[]);
      setLoading(false);
    })();
  }, []);

  const csv = () => {
    const lines = ["email,subscribed_at", ...rows.map((r) => `${r.email},${r.created_at}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "photolancer-subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Subscribers">
      <div className="flex items-center justify-between gap-3">
        <p className="text-ink-muted">Newsletter signups from the footer form.</p>
        {rows.length > 0 && (
          <button onClick={csv} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink hover:border-sun-300">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-line bg-white p-2 shadow-soft">
        {loading ? (
          <div className="p-8 text-center text-ink-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Mail className="mx-auto h-8 w-8 text-ink-muted" />
            <p className="mt-3 font-display text-lg font-extrabold text-ink">No subscribers yet</p>
            <p className="mt-1 text-sm text-ink-muted">When visitors sign up from the footer, they'll appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
              <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Subscribed</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold text-ink">{r.email}</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
