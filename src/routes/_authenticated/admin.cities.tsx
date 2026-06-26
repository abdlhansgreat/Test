import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Star } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cities")({
  head: () => ({ meta: [{ title: "Cities — Admin" }] }),
  component: CitiesPage,
});

interface C { id: string; name: string; slug: string; state: string | null; lat: number | null; lng: number | null; popular: boolean; }

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function CitiesPage() {
  const [rows, setRows] = useState<C[]>([]);
  const [form, setForm] = useState({ name: "", state: "", lat: "", lng: "" });

  const load = async () => {
    const { data } = await supabase.from("cities").select("*").order("popular", { ascending: false }).order("name");
    setRows((data ?? []) as C[]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("cities").insert({
      name: form.name.trim(), slug: slugify(form.name),
      state: form.state || null,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
    });
    if (error) toast.error(error.message); else { setForm({ name: "", state: "", lat: "", lng: "" }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete city?")) return;
    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const togglePopular = async (c: C) => {
    await supabase.from("cities").update({ popular: !c.popular }).eq("id", c.id); load();
  };
  const edit = async (c: C) => {
    const n = prompt("Name", c.name); if (!n) return;
    const s = prompt("State", c.state ?? "") ?? null;
    await supabase.from("cities").update({ name: n, slug: slugify(n), state: s }).eq("id", c.id); load();
  };

  return (
    <AdminLayout title="Cities">
      <div className="mb-6 grid gap-2 rounded-3xl border border-line bg-white p-4 shadow-soft md:grid-cols-5">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="City name" className="rounded-2xl border border-line px-3 py-2 text-sm outline-none focus:border-sun-300 md:col-span-2" />
        <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="rounded-2xl border border-line px-3 py-2 text-sm outline-none focus:border-sun-300" />
        <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="Lat" className="rounded-2xl border border-line px-3 py-2 text-sm outline-none focus:border-sun-300" />
        <input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="Lng" className="rounded-2xl border border-line px-3 py-2 text-sm outline-none focus:border-sun-300" />
        <div className="md:col-span-5"><SunButton onClick={add}><Plus className="h-4 w-4" /> Add city</SunButton></div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-sun-50/60 text-left text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Coordinates</th><th className="px-4 py-3">Popular</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{c.name} <span className="text-[12px] text-ink-muted">/{c.slug}</span></td>
                <td className="px-4 py-3 text-ink-muted">{c.state ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">{c.lat != null && c.lng != null ? `${c.lat}, ${c.lng}` : "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => togglePopular(c)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${c.popular ? "bg-sun-300 text-ink" : "bg-ink/5 text-ink-muted"}`}>
                    <Star className={`h-3 w-3 ${c.popular ? "fill-ink" : ""}`} /> {c.popular ? "Popular" : "—"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => edit(c)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300"><Pencil className="h-3 w-3" /> Edit</button>
                    <button onClick={() => remove(c.id)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-error hover:border-error"><Trash2 className="h-3 w-3" /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
