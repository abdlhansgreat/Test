import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, MapPin, Calendar as CalendarIcon, IndianRupee, Briefcase, Filter as FilterIcon } from "lucide-react";
import { format } from "date-fns";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { supabase } from "@/integrations/supabase/client";
import { GIG_ROLES, gigRoleLabel } from "@/lib/gigs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gigs/")({
  head: () => ({
    meta: [
      { title: "Photographer gigs — PhotoLancer" },
      { name: "description", content: "Find second-shooter, associate and cinematographer gigs from studios across India." },
    ],
  }),
  component: GigsPage,
});

interface Genre { id: string; name: string; slug: string }
interface GigRow {
  id: string; title: string; role: string; genre_id: string | null;
  event_date: string | null; city: string | null; day_rate: number | null;
  description: string | null; status: string;
  posted_by: string;
  photographers: { business_name: string; verified: boolean | null; slug: string } | null;
  genres: { name: string } | null;
}

function GigsPage() {
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [city, setCity] = useState("");
  const [genreId, setGenreId] = useState("");
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    supabase.from("genres").select("id, name, slug").order("name").then(({ data }) => setGenres((data ?? []) as Genre[]));
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("gigs")
      .select("*, photographers(business_name, verified, slug), genres(name)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (role) q = q.eq("role", role);
    if (genreId) q = q.eq("genre_id", genreId);
    if (city) q = q.ilike("city", `%${city}%`);
    if (minRate) q = q.gte("day_rate", Number(minRate));
    if (maxRate) q = q.lte("day_rate", Number(maxRate));
    if (date) q = q.eq("event_date", date);
    q.then(({ data }) => { setGigs((data ?? []) as any); setLoading(false); });
  }, [role, genreId, city, minRate, maxRate, date]);

  const total = gigs.length;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sun-300/60 bg-sun-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700">
              <Briefcase className="h-3.5 w-3.5" /> For photographers
            </span>
            <h1 className="mt-3 font-display text-[clamp(28px,4vw,42px)] font-extrabold text-ink">Find gigs</h1>
            <p className="mt-1 text-ink-muted">Second shooter, associate and cinematographer roles from verified studios.</p>
          </div>
          <div className="text-[13px] font-semibold text-ink-muted">{loading ? "Loading…" : `${total} open gig${total === 1 ? "" : "s"}`}</div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filters */}
          <aside className="rounded-3xl border border-line bg-white p-5 shadow-soft h-fit">
            <div className="flex items-center gap-2 text-ink">
              <FilterIcon className="h-4 w-4" /><h2 className="font-display text-base font-extrabold">Filters</h2>
            </div>

            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value)} className={fieldClass}>
                <option value="">Any role</option>
                {GIG_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Genre">
              <select value={genreId} onChange={(e) => setGenreId(e.target.value)} className={fieldClass}>
                <option value="">Any genre</option>
                {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai, Delhi…" className={fieldClass} />
            </Field>
            <Field label="Event date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            </Field>
            <Field label="Day rate (₹)">
              <div className="flex gap-2">
                <input inputMode="numeric" value={minRate} onChange={(e) => setMinRate(e.target.value.replace(/\D/g, ""))} placeholder="Min" className={fieldClass} />
                <input inputMode="numeric" value={maxRate} onChange={(e) => setMaxRate(e.target.value.replace(/\D/g, ""))} placeholder="Max" className={fieldClass} />
              </div>
            </Field>
            {(role || city || genreId || minRate || maxRate || date) && (
              <button
                onClick={() => { setRole(""); setCity(""); setGenreId(""); setMinRate(""); setMaxRate(""); setDate(""); }}
                className="mt-4 w-full rounded-xl border border-line py-2 text-[13px] font-semibold text-ink hover:border-sun-300 hover:bg-sun-50"
              >Clear all</button>
            )}
          </aside>

          {/* Gigs list */}
          <section>
            {loading ? (
              <div className="rounded-3xl border border-line bg-white p-10 text-center text-ink-muted">Loading gigs…</div>
            ) : gigs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line bg-sun-50/30 p-10 text-center text-ink-muted">
                No open gigs match these filters yet. Check back soon.
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {gigs.map((g) => (
                  <li key={g.id}>
                    <Link to="/gigs/$id" params={{ id: g.id }} className="block h-full rounded-3xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-sun-300 hover:shadow-warm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sun-700">
                          {gigRoleLabel(g.role)}
                        </span>
                        {g.genres?.name && (
                          <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">{g.genres.name}</span>
                        )}
                      </div>
                      <h3 className="mt-3 font-display text-lg font-extrabold text-ink line-clamp-2">{g.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-ink-muted">
                        {g.event_date && <span className="inline-flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" />{format(new Date(g.event_date), "MMM d, yyyy")}</span>}
                        {g.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{g.city}</span>}
                        {g.day_rate != null && <span className="inline-flex items-center gap-1 font-bold text-sun-700"><IndianRupee className="h-3.5 w-3.5" />{Number(g.day_rate).toLocaleString("en-IN")}/day</span>}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-[13px]">
                        <span className="truncate font-semibold text-ink">{g.photographers?.business_name ?? "Studio"}</span>
                        {g.photographers?.verified && (
                          <span className="inline-flex items-center gap-1 text-sun-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
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
