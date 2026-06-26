import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { SunButton } from "@/components/sun/SunButton";

export const Route = createFileRoute("/_authenticated/studio/packages")({
  head: () => ({
    meta: [{ title: "Packages — PhotoLancer Studio" }],
  }),
  component: PackagesEditor,
});

interface Pkg {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  duration: string | null;
  deliverables: string[] | null;
}

function emptyDraft() {
  return {
    title: "",
    description: "",
    price: "",
    duration: "",
    deliverables: [] as string[],
    deliverableDraft: "",
  };
}

function PackagesEditor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [photogId, setPhotogId] = useState<string | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("photographers")
        .select("id")
        .eq("profile_id", u.user.id)
        .maybeSingle();
      if (!p) { navigate({ to: "/onboarding" }); return; }
      setPhotogId(p.id);
      await load(p.id);
      setLoading(false);
    })();
  }, [navigate]);

  async function load(pid: string) {
    const { data } = await supabase
      .from("packages")
      .select("*")
      .eq("photographer_id", pid)
      .order("price", { ascending: true, nullsFirst: false });
    setPackages((data ?? []) as Pkg[]);
  }

  function startNew() {
    setDraft(emptyDraft());
    setEditing("new");
  }
  function startEdit(p: Pkg) {
    setDraft({
      title: p.title,
      description: p.description ?? "",
      price: p.price != null ? String(p.price) : "",
      duration: p.duration ?? "",
      deliverables: p.deliverables ?? [],
      deliverableDraft: "",
    });
    setEditing(p.id);
  }
  function addDeliverable() {
    const v = draft.deliverableDraft.trim();
    if (!v) return;
    setDraft({ ...draft, deliverables: [...draft.deliverables, v], deliverableDraft: "" });
  }
  function removeDeliverable(i: number) {
    const next = draft.deliverables.filter((_, idx) => idx !== i);
    setDraft({ ...draft, deliverables: next });
  }

  async function save() {
    if (!photogId || !draft.title.trim()) return;
    setSaving(true);
    const payload = {
      photographer_id: photogId,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      price: draft.price ? Number(draft.price) : null,
      duration: draft.duration.trim() || null,
      deliverables: draft.deliverables.length ? draft.deliverables : null,
    };
    if (editing === "new") {
      await supabase.from("packages").insert(payload);
    } else if (editing) {
      await supabase.from("packages").update(payload).eq("id", editing);
    }
    setSaving(false);
    setEditing(null);
    await load(photogId);
  }

  async function remove(id: string) {
    if (!confirm("Delete this package?")) return;
    await supabase.from("packages").delete().eq("id", id);
    if (photogId) await load(photogId);
  }

  if (loading) {
    return (
      <StudioLayout title="Packages">
        <div className="text-ink-muted">Loading packages…</div>
      </StudioLayout>
    );
  }

  return (
    <StudioLayout title="Packages">
      <div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold text-ink">Packages</h1>
            <p className="mt-2 text-ink-muted">Real packages help clients self-qualify before they message you.</p>
          </div>
          <SunButton variant="primary" onClick={startNew}>
            <Plus className="h-4 w-4" /> New package
          </SunButton>
        </div>

        {packages.length === 0 && editing === null && (
          <div className="mt-8 rounded-3xl border border-dashed border-line bg-sun-50/30 p-10 text-center text-ink-muted">
            No packages yet. Add your first one.
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {packages.map((p) =>
            editing === p.id ? (
              <PackageForm
                key={p.id}
                draft={draft}
                setDraft={setDraft}
                onAddDeliverable={addDeliverable}
                onRemoveDeliverable={removeDeliverable}
                onCancel={() => setEditing(null)}
                onSave={save}
                saving={saving}
              />
            ) : (
              <div key={p.id} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-ink">{p.title}</h3>
                    {p.duration && <div className="text-[13px] text-ink-muted">{p.duration}</div>}
                  </div>
                  <div className="text-right">
                    {p.price != null && (
                      <div className="font-display text-xl font-extrabold text-sun-700">
                        ₹{Number(p.price).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
                {p.description && <p className="mt-3 text-[14px] text-ink-muted">{p.description}</p>}
                {p.deliverables && p.deliverables.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-[14px] text-ink">
                    {p.deliverables.map((d, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" />
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 flex gap-2">
                  <SunButton variant="secondary" size="sm" onClick={() => startEdit(p)}>Edit</SunButton>
                  <button
                    onClick={() => remove(p.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[13px] font-semibold text-ink-muted hover:text-sun-700"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            ),
          )}

          {editing === "new" && (
            <PackageForm
              draft={draft}
              setDraft={setDraft}
              onAddDeliverable={addDeliverable}
              onRemoveDeliverable={removeDeliverable}
              onCancel={() => setEditing(null)}
              onSave={save}
              saving={saving}
            />
          )}
        </div>
      </div>
    </StudioLayout>
  );
}

interface FormProps {
  draft: ReturnType<typeof emptyDraft>;
  setDraft: (d: ReturnType<typeof emptyDraft>) => void;
  onAddDeliverable: () => void;
  onRemoveDeliverable: (i: number) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

function PackageForm({ draft, setDraft, onAddDeliverable, onRemoveDeliverable, onCancel, onSave, saving }: FormProps) {
  return (
    <div className="rounded-3xl border border-sun-300 bg-white p-6 shadow-warm">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-sun-300"
            placeholder="e.g. Wedding day coverage"
          />
        </Field>
        <Field label="Price (₹)">
          <input
            type="number"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-sun-300"
            placeholder="75000"
          />
        </Field>
        <Field label="Duration">
          <input
            value={draft.duration}
            onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-sun-300"
            placeholder="8 hours"
          />
        </Field>
        <Field label="Description" full>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-sun-300"
            placeholder="What's included, your approach…"
          />
        </Field>
        <Field label="Deliverables" full>
          <div className="flex flex-wrap gap-2">
            {draft.deliverables.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-3 py-1 text-[13px] font-semibold text-ink">
                {d}
                <button onClick={() => onRemoveDeliverable(i)} aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={draft.deliverableDraft}
              onChange={(e) => setDraft({ ...draft, deliverableDraft: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddDeliverable(); } }}
              placeholder="e.g. 300 edited photos"
              className="flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-sun-300"
            />
            <SunButton variant="secondary" size="sm" onClick={onAddDeliverable}>
              <Plus className="h-4 w-4" /> Add
            </SunButton>
          </div>
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <SunButton variant="ghost" onClick={onCancel}>Cancel</SunButton>
        <SunButton variant="primary" onClick={onSave} disabled={saving || !draft.title.trim()}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save package
        </SunButton>
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={full ? "md:col-span-2" : ""}>
      <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
