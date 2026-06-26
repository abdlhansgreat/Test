import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Briefcase, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { GIG_ROLES, gigRoleLabel } from "@/lib/gigs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio/gigs")({
  head: () => ({
    meta: [
      { title: "My gigs — PhotoLancer Studio" },
      { name: "description", content: "Post and manage gigs for second shooters and freelance crew." },
    ],
  }),
  component: StudioGigsPage,
});

interface Genre { id: string; name: string }
interface GigRow {
  id: string; title: string; role: string; event_date: string | null; city: string | null;
  day_rate: number | null; status: string; created_at: string;
  gig_applications: { id: string }[];
}

function StudioGigsPage() {
  const navigate = useNavigate();
  const [photogId, setPhotogId] = useState<string | null>(null);
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<string>(GIG_ROLES[0].key);
  const [genreId, setGenreId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [city, setCity] = useState("");
  const [dayRate, setDayRate] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data: p } = await supabase
      .from("photographers").select("id").eq("profile_id", u.user.id).maybeSingle();
    if (!p) { navigate({ to: "/onboarding" }); return; }
    setPhotogId(p.id);
    const [{ data: g }, { data: gn }] = await Promise.all([
      supabase.from("gigs").select("*, gig_applications(id)").eq("posted_by", p.id).order("created_at", { ascending: false }),
      supabase.from("genres").select("id, name").order("name"),
    ]);
    setGigs((g ?? []) as any);
    setGenres((gn ?? []) as Genre[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photogId) return;
    if (!title.trim()) { setErr("Add a title."); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from("gigs").insert({
      posted_by: photogId,
      title: title.trim(),
      role,
      genre_id: genreId || null,
      event_date: eventDate || null,
      city: city.trim() || null,
      day_rate: dayRate ? Number(dayRate) : null,
      description: desc.trim() || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setTitle(""); setGenreId(""); setEventDate(""); setCity(""); setDayRate(""); setDesc("");
    load();
  };

  const setStatus = async (id: string, status: "open" | "closed") => {
    await supabase.from("gigs").update({ status }).eq("id", id);
    load();
  };

  return (
    <StudioLayout title="Gigs">
      <div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sun-300/60 bg-sun-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700">
              <Briefcase className="h-3.5 w-3.5" /> B2B
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">My gigs</h1>
            <p className="mt-1 text-ink-muted">Hire freelance second shooters, associates and cinematographers.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* List */}
          <section>
            <h2 className="font-display text-lg font-extrabold text-ink">Your posts</h2>
            {loading ? (
              <div className="mt-4 rounded-2xl border border-line bg-white p-6 text-ink-muted">Loading…</div>
            ) : gigs.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-line bg-sun-50/30 p-10 text-center text-ink-muted">
                You haven't posted any gigs yet. Create one on the right →
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {gigs.map((g) => (
                  <li key={g.id} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-sun-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sun-700">{gigRoleLabel(g.role)}</span>
                          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase", g.status === "open" ? "bg-green-50 text-green-700" : g.status === "filled" ? "bg-sun-100 text-sun-700" : "bg-ink/5 text-ink-muted")}>{g.status}</span>
                        </div>
                        <Link to="/gigs/$id" params={{ id: g.id }} className="mt-2 inline-block font-display text-base font-extrabold text-ink hover:text-sun-700">{g.title}</Link>
                        <div className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-ink-muted">
                          {g.event_date && <span>{format(new Date(g.event_date), "MMM d, yyyy")}</span>}
                          {g.city && <span>· {g.city}</span>}
                          {g.day_rate != null && <span>· ₹{Number(g.day_rate).toLocaleString("en-IN")}/day</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-bold text-sun-700">
                          <Users className="h-3.5 w-3.5" /> {g.gig_applications?.length ?? 0} applicants
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                          <Link to="/gigs/$id" params={{ id: g.id }}><SunButton size="sm" variant="secondary">Manage</SunButton></Link>
                          {g.status === "open" ? (
                            <SunButton size="sm" variant="secondary" onClick={() => setStatus(g.id, "closed")}>Close</SunButton>
                          ) : g.status === "closed" ? (
                            <SunButton size="sm" variant="secondary" onClick={() => setStatus(g.id, "open")}>Reopen</SunButton>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Form */}
          <aside>
            <form onSubmit={submit} className="rounded-3xl border border-line bg-white p-6 shadow-warm">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-sun-700" />
                <h2 className="font-display text-lg font-extrabold text-ink">Post a gig</h2>
              </div>

              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Second shooter — wedding in Goa" className={fieldClass} />
              </Field>
              <Field label="Role">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldClass}>
                  {GIG_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Genre">
                <select value={genreId} onChange={(e) => setGenreId(e.target.value)} className={fieldClass}>
                  <option value="">Any</option>
                  {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Event date">
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={fieldClass} />
                </Field>
                <Field label="City">
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" className={fieldClass} />
                </Field>
              </div>
              <Field label="Day rate (₹)">
                <input inputMode="numeric" value={dayRate} onChange={(e) => setDayRate(e.target.value.replace(/\D/g, ""))} placeholder="15000" className={fieldClass} />
              </Field>
              <Field label="Description">
                <textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000}
                  placeholder="Day-long shoot, lead photographer covers ceremony. Looking for someone with own gear, comfortable with candid and group shots."
                  className="w-full rounded-xl border border-line bg-white p-3 text-[14px] outline-none focus:border-sun-500" />
              </Field>
              {err && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
              <SunButton type="submit" className="mt-4 w-full" disabled={busy}>{busy ? "Posting…" : "Post gig"}</SunButton>
            </form>
          </aside>
        </div>
      </div>
    </StudioLayout>
  );
}

const fieldClass = "h-10 w-full rounded-xl border border-line bg-white px-3 text-[14px] outline-none focus:border-sun-500";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
