import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, BadgeCheck, MapPin, Calendar as CalendarIcon, IndianRupee, Check, X as XIcon, Star, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { Navbar } from "@/components/sun/Navbar";
import { SunButton } from "@/components/sun/SunButton";
import { ContractView } from "@/components/sun/ContractView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { gigRoleLabel, acceptApplication } from "@/lib/gigs";
import { findOrCreateConversation } from "@/lib/messaging";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/gigs/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Gig — PhotoLancer` },
      { name: "description", content: `Open photography gig on PhotoLancer.` },
    ],
  }),
  errorComponent: () => <ShellMsg msg="Something went wrong loading this gig." />,
  notFoundComponent: () => <ShellMsg msg="This gig doesn't exist or was removed." />,
  component: GigDetail,
});

interface GigRow {
  id: string; title: string; role: string; description: string | null;
  event_date: string | null; city: string | null; day_rate: number | null;
  status: string; posted_by: string;
  photographers: { id: string; business_name: string; slug: string; verified: boolean | null; profile_id: string } | null;
  genres: { name: string } | null;
}
interface AppRow {
  id: string; gig_id: string; applicant_id: string; message: string | null;
  quoted_rate: number | null; status: string; created_at: string;
  photographers: { id: string; business_name: string; slug: string; profile_id: string; rating_avg: number | null; review_count: number | null } | null;
}
interface ContractRow {
  id: string; gig_id: string | null; gig_application_id: string | null; booking_id: string | null;
  template_type: string | null; terms_json: any; copyright_terms: string | null; usage_terms: string | null;
  signed_by_a: boolean; signed_by_b: boolean; signed_at: string | null;
}

function GigDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gig, setGig] = useState<GigRow | null>(null);
  const [myPhotogId, setMyPhotogId] = useState<string | null>(null);
  const [myApp, setMyApp] = useState<AppRow | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [contract, setContract] = useState<ContractRow | null>(null);

  const [message, setMessage] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: g } = await supabase
      .from("gigs")
      .select("*, photographers(id, business_name, slug, verified, profile_id), genres(name)")
      .eq("id", id).maybeSingle();
    setGig(g as any);
    let myPid: string | null = null;
    if (user) {
      const { data: me } = await supabase
        .from("photographers").select("id").eq("profile_id", user.id).maybeSingle();
      myPid = me?.id ?? null;
      setMyPhotogId(myPid);
    }
    const { data: appsData } = await supabase
      .from("gig_applications")
      .select("*, photographers(id, business_name, slug, profile_id, rating_avg, review_count)")
      .eq("gig_id", id)
      .order("created_at", { ascending: false });
    const list = (appsData ?? []) as any as AppRow[];
    setApps(list);
    setMyApp(myPid ? list.find((a) => a.applicant_id === myPid) ?? null : null);

    const { data: c } = await supabase
      .from("contracts").select("*").eq("gig_id", id).maybeSingle();
    setContract((c as any) ?? null);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Shell><div className="text-ink-muted">Loading gig…</div></Shell>;
  if (!gig) return <ShellMsg msg="This gig doesn't exist or was removed." />;

  const isPoster = !!gig.photographers && user?.id === gig.photographers.profile_id;
  const canApply = !!user && !isPoster && !!myPhotogId && gig.status === "open" && !myApp;

  const apply = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (!myPhotogId) { setErr("Complete your photographer profile to apply."); return; }
    if (!message.trim()) { setErr("Add a short pitch."); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.from("gig_applications").insert({
      gig_id: gig.id,
      applicant_id: myPhotogId,
      message: message.trim(),
      quoted_rate: rate ? Number(rate) : null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    try {
      const { notify } = await import("@/lib/notify");
      const { data: me } = await supabase.from("photographers").select("business_name").eq("id", myPhotogId).maybeSingle();
      if (gig.photographers?.profile_id) {
        notify({
          event: "new_application",
          recipients: [{ user_id: gig.photographers.profile_id }],
          data: { gig_id: gig.id, gig_title: gig.title, applicant_name: me?.business_name ?? "A photographer", note: message.trim() },
        });
      }
    } catch { /* ignore */ }
    setMessage(""); setRate("");
    load();
  };

  const updateStatus = async (appId: string, next: "shortlisted" | "declined") => {
    await supabase.from("gig_applications").update({ status: next }).eq("id", appId);
    load();
  };

  const accept = async (a: AppRow) => {
    setBusy(true); setErr(null);
    try {
      const { booking_id } = await acceptApplication({
        application: { id: a.id, gig_id: gig.id, applicant_id: a.applicant_id, quoted_rate: a.quoted_rate },
        gig: { id: gig.id, posted_by: gig.posted_by, title: gig.title, role: gig.role, event_date: gig.event_date, city: gig.city, day_rate: gig.day_rate },
      });
      navigate({ to: "/bookings/$id", params: { id: booking_id }, search: { pay: 1 } as any });
    } catch (e: any) {
      setErr(e.message ?? "Could not accept this applicant.");
    } finally { setBusy(false); }
  };

  const messageFreelancer = async (profileId: string) => {
    try {
      const cid = await findOrCreateConversation(profileId);
      navigate({ to: "/messages/$conversationId", params: { conversationId: cid } });
    } catch (e) { console.error(e); }
  };

  const mySide: "a" | "b" | null = !contract ? null
    : isPoster ? "a"
    : myPhotogId && contract.gig_application_id && apps.find((a) => a.id === contract.gig_application_id)?.applicant_id === myPhotogId ? "b"
    : null;

  return (
    <Shell>
      <Link to="/gigs" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-sun-700">
        <ArrowLeft className="h-4 w-4" /> All gigs
      </Link>

      <div className="mt-4 rounded-3xl border border-line bg-white p-6 shadow-soft md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sun-700">{gigRoleLabel(gig.role)}</span>
              {gig.genres?.name && <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">{gig.genres.name}</span>}
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase", gig.status === "open" ? "bg-green-50 text-green-700" : "bg-ink/5 text-ink-muted")}>{gig.status}</span>
            </div>
            <h1 className="mt-3 font-display text-[clamp(24px,3.4vw,34px)] font-extrabold text-ink">{gig.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] text-ink-muted">
              {gig.event_date && <span className="inline-flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" />{format(new Date(gig.event_date), "MMM d, yyyy")}</span>}
              {gig.city && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{gig.city}</span>}
              {gig.day_rate != null && <span className="inline-flex items-center gap-1.5 font-bold text-sun-700"><IndianRupee className="h-4 w-4" />₹{Number(gig.day_rate).toLocaleString("en-IN")}/day</span>}
            </div>
          </div>
          {gig.photographers && (
            <Link to="/p/$slug" params={{ slug: gig.photographers.slug }} className="rounded-2xl border border-line bg-sun-50/40 p-3 text-right hover:border-sun-300">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Posted by</div>
              <div className="mt-0.5 inline-flex items-center gap-1 font-display text-base font-extrabold text-ink">
                {gig.photographers.business_name}
                {gig.photographers.verified && <BadgeCheck className="h-4 w-4 text-sun-700" />}
              </div>
            </Link>
          )}
        </div>

        {gig.description && (
          <div className="mt-6 whitespace-pre-line rounded-2xl bg-sun-50/30 p-4 text-[14px] leading-relaxed text-ink">
            {gig.description}
          </div>
        )}
      </div>

      {/* Apply box (freelancer view) */}
      {!isPoster && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-extrabold text-ink">Apply for this gig</h2>
          {myApp ? (
            <div className="mt-4 rounded-2xl bg-sun-50/40 p-4 text-[14px]">
              <div className="font-semibold text-ink">Your application is <span className="uppercase text-sun-700">{myApp.status}</span>.</div>
              {myApp.quoted_rate != null && <div className="mt-1 text-ink-muted">Quoted ₹{Number(myApp.quoted_rate).toLocaleString("en-IN")}/day</div>}
              {myApp.message && <p className="mt-2 whitespace-pre-line text-ink">{myApp.message}</p>}
            </div>
          ) : gig.status !== "open" ? (
            <p className="mt-3 text-ink-muted">This gig is no longer accepting applications.</p>
          ) : !user ? (
            <div className="mt-3">
              <p className="text-ink-muted">Sign in as a photographer to apply.</p>
              <Link to="/login" className="mt-3 inline-block"><SunButton>Sign in</SunButton></Link>
            </div>
          ) : !myPhotogId ? (
            <div className="mt-3">
              <p className="text-ink-muted">Create your photographer profile first.</p>
              <Link to="/onboarding" className="mt-3 inline-block"><SunButton>Create profile</SunButton></Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Your pitch</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1000}
                  placeholder="Why you're a great fit — relevant experience, gear, availability."
                  className="mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-[15px] outline-none focus:border-sun-500" />
              </label>
              <label className="block">
                <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Quoted day rate (₹)</span>
                <input value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))}
                  placeholder={gig.day_rate ? String(gig.day_rate) : "e.g. 15000"} inputMode="numeric"
                  className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-4 text-[15px] outline-none focus:border-sun-500" />
              </label>
              {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
              <SunButton onClick={apply} disabled={busy || !canApply}>{busy ? "Sending…" : "Send application"}</SunButton>
            </div>
          )}
        </section>
      )}

      {/* Poster: applicants */}
      {isPoster && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg font-extrabold text-ink">Applicants <span className="text-ink-muted">({apps.length})</span></h2>
          {apps.length === 0 ? (
            <p className="mt-3 text-ink-muted">No applicants yet. Share your gig to attract photographers.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {apps.map((a) => (
                <li key={a.id} className="rounded-2xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link to="/p/$slug" params={{ slug: a.photographers?.slug ?? "" }} className="font-display text-base font-extrabold text-ink hover:text-sun-700">
                          {a.photographers?.business_name ?? "Photographer"}
                        </Link>
                        <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted">
                          <Star className="h-3.5 w-3.5 fill-sun-400 text-sun-400" />
                          {(a.photographers?.rating_avg ?? 0).toFixed(1)} · {a.photographers?.review_count ?? 0}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-ink-muted">{format(new Date(a.created_at), "MMM d, yyyy")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase", a.status === "accepted" ? "bg-green-50 text-green-700" : a.status === "shortlisted" ? "bg-sun-50 text-sun-700" : a.status === "declined" ? "bg-ink/5 text-ink-muted" : "bg-sun-50/60 text-ink")}>{a.status}</span>
                      {a.quoted_rate != null && <span className="rounded-full bg-sun-50 px-2.5 py-0.5 text-[12px] font-bold text-sun-700">₹{Number(a.quoted_rate).toLocaleString("en-IN")}/day</span>}
                    </div>
                  </div>
                  {a.message && <p className="mt-3 whitespace-pre-line text-[14px] text-ink">{a.message}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {a.photographers?.profile_id && (
                      <SunButton size="sm" variant="secondary" onClick={() => messageFreelancer(a.photographers!.profile_id)}>
                        <MessageCircle className="h-4 w-4" /> Message
                      </SunButton>
                    )}
                    {gig.status === "open" && a.status !== "accepted" && (
                      <>
                        {a.status !== "shortlisted" && (
                          <SunButton size="sm" variant="secondary" onClick={() => updateStatus(a.id, "shortlisted")}>
                            <Star className="h-4 w-4" /> Shortlist
                          </SunButton>
                        )}
                        {a.status !== "declined" && (
                          <SunButton size="sm" variant="secondary" onClick={() => updateStatus(a.id, "declined")}>
                            <XIcon className="h-4 w-4" /> Decline
                          </SunButton>
                        )}
                        <SunButton size="sm" onClick={() => accept(a)} disabled={busy}>
                          <Check className="h-4 w-4" /> Accept & contract
                        </SunButton>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {err && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        </section>
      )}

      {/* Contract */}
      {contract && (
        <section className="mt-6">
          <ContractView
            contract={contract}
            side={mySide}
            posterName={gig.photographers?.business_name}
            freelancerName={apps.find((a) => a.id === contract.gig_application_id)?.photographers?.business_name}
            onUpdated={load}
          />
        </section>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8">{children}</main>
    </div>
  );
}
function ShellMsg({ msg }: { msg: string }) {
  return (
    <Shell>
      <h1 className="font-display text-2xl font-extrabold text-ink">Gig not available</h1>
      <p className="mt-2 text-ink-muted">{msg}</p>
      <Link to="/gigs" className="mt-6 inline-block"><SunButton variant="secondary">Browse gigs</SunButton></Link>
    </Shell>
  );
}
