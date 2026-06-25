import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/genres")({
  head: () => ({ meta: [{ title: "Genres — Admin" }] }),
  component: GenresPage,
});

interface G { id: string; name: string; slug: string; }

function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function GenresPage() {
  const [rows, setRows] = useState<G[]>([]);
  const [name, setName] = useState("");

  const load = async () => {
    const { data } = await supabase.from("genres").select("id, name, slug").order("name");
    setRows((data ?? []) as G[]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("genres").insert({ name: name.trim(), slug: slugify(name) });
    if (error) toast.error(error.message); else { setName(""); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete genre?")) return;
    const { error } = await supabase.from("genres").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const rename = async (g: G) => {
    const newName = prompt("New name", g.name);
    if (!newName) return;
    const { error } = await supabase.from("genres").update({ name: newName, slug: slugify(newName) }).eq("id", g.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <AdminLayout title="Genres">
      <div className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-line bg-white p-4 shadow-soft">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New genre name" className="flex-1 rounded-2xl border border-line px-4 py-2 text-sm outline-none focus:border-sun-300" />
        <SunButton onClick={add}><Plus className="h-4 w-4" /> Add</SunButton>
      </div>
      <div className="rounded-3xl border border-line bg-white shadow-soft">
        {rows.map((g) => (
          <div key={g.id} className="flex items-center justify-between border-t border-line px-4 py-3 first:border-0">
            <div><strong className="text-ink">{g.name}</strong> <span className="text-[12px] text-ink-muted">/{g.slug}</span></div>
            <div className="flex gap-1.5">
              <button onClick={() => rename(g)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300"><Pencil className="h-3 w-3" /> Rename</button>
              <button onClick={() => remove(g.id)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-error hover:border-error"><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-10 text-center text-ink-muted">No genres yet.</div>}
      </div>
    </AdminLayout>
  );
}
