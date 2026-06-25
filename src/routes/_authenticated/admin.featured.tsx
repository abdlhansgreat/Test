import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Calendar } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/featured")({
  head: () => ({ meta: [{ title: "Featured — Admin" }] }),
  component: FeaturedPage,
});

interface Row { id: string; business_name: string; base_city: string | null; featured: boolean; featured_until: string | null; }

function FeaturedPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabase.from("photographers")
      .select("id, business_name, base_city, featured, featured_until")
      .order("featured_until", { ascending: false, nullsFirst: false }).limit(500);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, featured: boolean, days: number) => {
    const until = featured ? new Date(Date.now() + days * 86400000).toISOString() : null;
    await supabase.from("photographers").update({ featured, featured_until: until }).eq("id", id);
    toast.success("Updated"); load();
  };

  const current = rows.filter((r) => r.featured && r.featured_until && new Date(r.featured_until) > new Date());
  const others = rows.filter((r) => !current.includes(r));

  const Card = ({ r }: { r: Row }) => {
    const isFeat = current.includes(r);
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
        <div>
          <div className="font-display font-bold text-ink">{r.business_name}</div>
          <div className="text-[12px] text-ink-muted">{r.base_city ?? "—"}{isFeat && r.featured_until && ` · until ${new Date(r.featured_until).toLocaleDateString()}`}</div>
        </div>
        <div className="flex gap-1.5">
          {!isFeat && <button onClick={() => update(r.id, true, 30)} className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-[12px] font-bold text-white"><Sparkles className="h-3 w-3" /> Feature 30d</button>}
          {!isFeat && <button onClick={() => update(r.id, true, 90)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-sun-300"><Calendar className="h-3 w-3" /> 90d</button>}
          {isFeat && <button onClick={() => update(r.id, false, 0)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-sun-300">Unfeature</button>}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Featured curation">
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-extrabold text-ink">Currently featured ({current.length})</h2>
        {current.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white p-10 text-center text-ink-muted shadow-soft">No featured photographers yet.</div>
        ) : (
          <div className="space-y-2">{current.map((r) => <Card key={r.id} r={r} />)}</div>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-extrabold text-ink">All photographers</h2>
        <div className="space-y-2">{others.slice(0, 50).map((r) => <Card key={r.id} r={r} />)}</div>
      </section>
    </AdminLayout>
  );
}
