import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Upload, Loader2, Check } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/verification")({
  head: () => ({ meta: [{ title: "Verification — Admin" }] }),
  component: VerificationPage,
});

interface Row { id: string; business_name: string; base_city: string | null; slug: string; verified: boolean | null; created_at: string; }

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

function VerificationPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [sendInvites, setSendInvites] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("photographers")
      .select("id, business_name, base_city, slug, verified, created_at")
      .order("verified", { ascending: true }).order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const toggleVerify = async (r: Row) => {
    const next = !r.verified;
    const { error } = await supabase.from("photographers").update({
      verified: next,
      verification_source: next ? "India Photographers Club" : null,
    }).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success(next ? "Verified" : "Unverified"); load(); }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const text = await f.text();
      const parsed = parseCSV(text);
      const { data, error } = await supabase.functions.invoke("import-photographers", { body: { rows: parsed, send_invites: sendInvites } });
      if (error) throw error;
      const sum = (data as { summary?: { created?: number; skipped?: number; invited?: number } } | null)?.summary ?? {};
      toast.success(`Imported ${sum.created ?? 0}, skipped ${sum.skipped ?? 0}${sendInvites ? `, invited ${sum.invited ?? 0}` : ""}`);
      load();
    } catch (err) {
      toast.error((err as Error).message ?? "Import failed");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <AdminLayout title="Verification">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-white p-5 shadow-soft">
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">Bulk import (CSV)</h2>
          <p className="text-sm text-ink-muted">Columns: email, full_name, business_name, base_city, starting_price, genres, kind, bio</p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink">
            <input type="checkbox" checked={sendInvites} onChange={(e) => setSendInvites(e.target.checked)} className="h-4 w-4 accent-sun-600" />
            Send claim invites to imported photographers
          </label>
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={onUpload} className="hidden" />
        <SunButton onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload CSV
        </SunButton>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-sun-50/60 text-left text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-3">Business</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold text-ink">{r.business_name}</td>
                <td className="px-4 py-3 text-ink-muted">{r.base_city ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success"><Check className="h-3 w-3" /> Verified</span>
                  ) : (
                    <span className="rounded-full bg-sun-50 px-2.5 py-1 text-[11px] font-bold text-sun-700">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleVerify(r)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-sun-300 hover:text-sun-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> {r.verified ? "Unverify" : "Verify"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink-muted">No photographers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
