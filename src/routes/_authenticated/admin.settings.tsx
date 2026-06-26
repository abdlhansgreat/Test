import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [id, setId] = useState<string | null>(null);
  const [commission, setCommission] = useState("0.10");
  const [featured, setFeatured] = useState("999");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings").select("*").limit(1).maybeSingle();
      if (data) {
        setId(data.id);
        setCommission(String(data.commission_rate));
        setFeatured(String(data.featured_price));
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { commission_rate: Number(commission), featured_price: Number(featured), updated_at: new Date().toISOString() };
      const { error } = id
        ? await supabase.from("platform_settings").update(payload).eq("id", id)
        : await supabase.from("platform_settings").insert(payload);
      if (error) throw error;
      toast.success("Saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <AdminLayout title="Platform settings">
      {loading ? (
        <div className="flex justify-center p-10 text-ink-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="max-w-xl space-y-4 rounded-3xl border border-line bg-white p-6 shadow-soft">
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">Commission rate (0–1)</span>
            <input type="number" step="0.01" min={0} max={1} value={commission} onChange={(e) => setCommission(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-line px-4 py-2 text-sm outline-none focus:border-sun-300" />
            <p className="mt-1 text-[12px] text-ink-muted">Applied at checkout. 0.10 = 10%.</p>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">Featured price (₹/month)</span>
            <input type="number" step="1" min={0} value={featured} onChange={(e) => setFeatured(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-line px-4 py-2 text-sm outline-none focus:border-sun-300" />
          </label>
          <SunButton onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
          </SunButton>
        </div>
      )}
    </AdminLayout>
  );
}
