import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Eye, Inbox, Calendar, Wallet, Star, Briefcase, ExternalLink, Settings, ArrowRight,
  MessageSquare, Plus, Camera, PartyPopper,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { SunButton } from "@/components/sun/SunButton";
import { ProfileCompleteness } from "@/components/sun/ProfileCompleteness";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/studio/")({
  validateSearch: z.object({ celebrate: z.coerce.number().optional() }),
  head: () => ({
    meta: [
      { title: "Your studio — PhotoLancer" },
      { name: "description", content: "Photographer dashboard: leads, bookings, earnings, and analytics." },
    ],
  }),
  component: StudioOverview,
});

type Activity = { id: string; kind: "inquiry" | "booking" | "review" | "application"; label: string; at: string; href?: { to: string; params: Record<string, string> } };

function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(k: string) {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short" });
}

function StudioOverview() {
  const navigate = useNavigate();
  const { celebrate } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [stats, setStats] = useState({
    leads: 0, upcoming: 0, held: 0, monthEarnings: 0, views: 0,
    rating: 0, reviews: 0, openGigs: 0, applications: 0,
  });
  const [earnSeries, setEarnSeries] = useState<{ month: string; released: number }[]>([]);
  const [convSeries, setConvSeries] = useState<{ month: string; inquiries: number; bookings: number }[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: photog } = await supabase
        .from("photographers").select("id, business_name, slug, rating_avg, review_count")
        .eq("profile_id", u.user.id).maybeSingle();
      if (!photog) { navigate({ to: "/onboarding" }); return; }
      setBusinessName(photog.business_name);
      setSlug(photog.slug);

      const pid = photog.id;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const [
        leadsRes, upcomingRes, viewsRes, bookingsRes, gigsRes, appsRes,
        inquiriesAllRes, bookingsAllRes,
        recentInquiriesRes, recentBookingsRes, recentReviewsRes, recentAppsRes,
      ] = await Promise.all([
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("photographer_id", pid).eq("status", "new"),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("photographer_id", pid).eq("status", "confirmed").gte("event_date", new Date().toISOString().slice(0, 10)),
        supabase.from("profile_views").select("id", { count: "exact", head: true }).eq("photographer_id", pid).gte("viewed_at", monthStart),
        supabase.from("bookings").select("amount, commission_amount, escrow_status, status, event_date, created_at").eq("photographer_id", pid),
        supabase.from("gigs").select("id", { count: "exact", head: true }).eq("posted_by", pid).eq("status", "open"),
        supabase.from("gig_applications").select("id, gigs!inner(posted_by)").eq("gigs.posted_by", pid),
        supabase.from("inquiries").select("created_at").eq("photographer_id", pid).gte("created_at", sixMonthsAgo.toISOString()),
        supabase.from("bookings").select("created_at, status").eq("photographer_id", pid).gte("created_at", sixMonthsAgo.toISOString()),
        supabase.from("inquiries").select("id, event_type, created_at, profiles!inquiries_customer_id_fkey(full_name)").eq("photographer_id", pid).order("created_at", { ascending: false }).limit(5),
        supabase.from("bookings").select("id, event_date, created_at, profiles!bookings_customer_id_fkey(full_name)").eq("photographer_id", pid).order("created_at", { ascending: false }).limit(5),
        supabase.from("reviews").select("id, rating, title, created_at, profiles!reviews_customer_id_fkey(full_name)").eq("photographer_id", pid).order("created_at", { ascending: false }).limit(5),
        supabase.from("gig_applications").select("id, created_at, gigs!inner(title, posted_by)").eq("gigs.posted_by", pid).order("created_at", { ascending: false }).limit(5),
      ]);

      // monthly aggregates
      const earnMap = new Map<string, number>();
      const inqMap = new Map<string, number>();
      const bookMap = new Map<string, number>();
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const k = monthKey(d);
        earnMap.set(k, 0); inqMap.set(k, 0); bookMap.set(k, 0);
      }
      let held = 0, monthEarnings = 0;
      for (const b of (bookingsRes.data ?? []) as Array<{ amount: number | null; commission_amount: number | null; escrow_status: string; status: string; event_date: string | null; created_at: string }>) {
        const net = (b.amount ?? 0) - (b.commission_amount ?? 0);
        if (b.escrow_status === "held" && (b.status === "confirmed" || b.status === "completed")) held += net;
        if (b.escrow_status === "released" && b.event_date) {
          const ed = new Date(b.event_date);
          const k = monthKey(ed);
          if (earnMap.has(k)) earnMap.set(k, (earnMap.get(k) || 0) + net);
          if (ed >= new Date(now.getFullYear(), now.getMonth(), 1)) monthEarnings += net;
        }
      }
      for (const i of (inquiriesAllRes.data ?? []) as Array<{ created_at: string }>) {
        const k = monthKey(new Date(i.created_at));
        if (inqMap.has(k)) inqMap.set(k, (inqMap.get(k) || 0) + 1);
      }
      for (const b of (bookingsAllRes.data ?? []) as Array<{ created_at: string; status: string }>) {
        if (b.status !== "confirmed" && b.status !== "completed") continue;
        const k = monthKey(new Date(b.created_at));
        if (bookMap.has(k)) bookMap.set(k, (bookMap.get(k) || 0) + 1);
      }

      setEarnSeries([...earnMap.entries()].map(([k, v]) => ({ month: monthLabel(k), released: v })));
      setConvSeries([...inqMap.entries()].map(([k, v]) => ({ month: monthLabel(k), inquiries: v, bookings: bookMap.get(k) || 0 })));

      setStats({
        leads: leadsRes.count ?? 0,
        upcoming: upcomingRes.count ?? 0,
        held,
        monthEarnings,
        views: viewsRes.count ?? 0,
        rating: photog.rating_avg ?? 0,
        reviews: photog.review_count ?? 0,
        openGigs: gigsRes.count ?? 0,
        applications: (appsRes.data ?? []).length,
      });

      // activity feed
      const acts: Activity[] = [];
      for (const r of (recentInquiriesRes.data ?? []) as unknown as Array<{ id: string; event_type: string | null; created_at: string; profiles: { full_name: string | null } | null }>) {
        acts.push({ id: `i-${r.id}`, kind: "inquiry", at: r.created_at, label: `New inquiry from ${r.profiles?.full_name ?? "a client"}${r.event_type ? ` · ${r.event_type}` : ""}`, href: { to: "/inquiries/$id", params: { id: r.id } } });
      }
      for (const r of (recentBookingsRes.data ?? []) as unknown as Array<{ id: string; event_date: string | null; created_at: string; profiles: { full_name: string | null } | null }>) {
        acts.push({ id: `b-${r.id}`, kind: "booking", at: r.created_at, label: `Booking with ${r.profiles?.full_name ?? "a client"}${r.event_date ? ` · ${r.event_date}` : ""}`, href: { to: "/bookings/$id", params: { id: r.id } } });
      }
      for (const r of (recentReviewsRes.data ?? []) as unknown as Array<{ id: string; rating: number; title: string | null; created_at: string; profiles: { full_name: string | null } | null }>) {
        acts.push({ id: `r-${r.id}`, kind: "review", at: r.created_at, label: `${r.profiles?.full_name ?? "A client"} left ${r.rating}★ — ${r.title ?? "review"}` });
      }
      for (const r of (recentAppsRes.data ?? []) as unknown as Array<{ id: string; created_at: string; gigs: { title: string } }>) {
        acts.push({ id: `a-${r.id}`, kind: "application", at: r.created_at, label: `New application for "${r.gigs?.title}"` });
      }
      acts.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setActivity(acts.slice(0, 10));

      setLoading(false);
    })();
  }, [navigate]);

  return (
    <StudioLayout title="Overview">
      {celebrate === 1 && (
        <div className="mb-6 rounded-3xl border border-sun-300/60 bg-gradient-to-br from-sun-50 to-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-soft">
              <PartyPopper className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Your profile is live! 🎉</h2>
              <p className="mt-1 text-[14px] text-ink-muted">Clients in your city can now find and book you. Keep adding portfolio work to climb the rankings.</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-300/60 bg-sun-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700">
            <Camera className="h-3.5 w-3.5" /> Studio
          </span>
          <h1 className="mt-3 truncate font-display text-[clamp(24px,3.5vw,38px)] font-extrabold text-ink">{businessName ?? "Your studio"}</h1>
          <p className="mt-1 text-ink-muted">Your home base for leads, bookings, and your public profile.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {slug && (
            <Link to="/p/$slug" params={{ slug }}>
              <SunButton variant="secondary"><ExternalLink className="h-4 w-4" /> Public profile</SunButton>
            </Link>
          )}
          <Link to="/studio/gigs"><SunButton variant="secondary"><Plus className="h-4 w-4" /> Post a gig</SunButton></Link>
          <Link to="/onboarding"><SunButton variant="secondary"><Settings className="h-4 w-4" /> Edit profile</SunButton></Link>
        </div>
      </div>

      <ProfileCompleteness />

      {loading ? (
        <div className="mt-10 text-ink-muted">Loading your studio…</div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Inbox className="h-5 w-5" />} label="New leads" value={String(stats.leads)} hint="awaiting your reply" />
            <StatCard icon={<Calendar className="h-5 w-5" />} label="Upcoming bookings" value={String(stats.upcoming)} hint="confirmed events" />
            <StatCard icon={<Wallet className="h-5 w-5" />} label="In escrow" value={inr(stats.held)} hint={`${inr(stats.monthEarnings)} released this month`} />
            <StatCard icon={<Eye className="h-5 w-5" />} label="Profile views" value={String(stats.views)} hint="this month" />
            <StatCard icon={<Star className="h-5 w-5" />} label="Rating" value={stats.reviews ? stats.rating.toFixed(2) : "—"} hint={`${stats.reviews} review${stats.reviews === 1 ? "" : "s"}`} />
            <StatCard icon={<Briefcase className="h-5 w-5" />} label="Open gigs" value={String(stats.openGigs)} hint={`${stats.applications} total applications`} />
            <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Messages" value="Inbox" hint="reply within 24h to stay top-ranked" />
            <StatCard icon={<Wallet className="h-5 w-5" />} label="This month" value={inr(stats.monthEarnings)} hint="released earnings" />
          </div>

          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold text-ink">Insights</h2>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <ChartCard title="Earnings (released) by month">
                {earnSeries.every((d) => d.released === 0) ? (
                  <EmptyChart msg="No released earnings yet. Complete a booking to see this fill in." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={earnSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1e6d2" />
                      <XAxis dataKey="month" stroke="#7c6a45" fontSize={12} />
                      <YAxis stroke="#7c6a45" fontSize={12} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ borderRadius: 12, border: "1px solid #f1e6d2" }} />
                      <Bar dataKey="released" fill="#ff8a2b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
              <ChartCard title="Inquiries vs. confirmed bookings">
                {convSeries.every((d) => d.inquiries === 0 && d.bookings === 0) ? (
                  <EmptyChart msg="No activity yet — your conversion trend will show up here." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={convSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1e6d2" />
                      <XAxis dataKey="month" stroke="#7c6a45" fontSize={12} />
                      <YAxis stroke="#7c6a45" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f1e6d2" }} />
                      <Legend />
                      <Line type="monotone" dataKey="inquiries" stroke="#ffc02e" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="bookings" stroke="#ff6a00" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold text-ink">Recent activity</h2>
            <div className="mt-4 rounded-3xl border border-line bg-white p-3 shadow-soft">
              {activity.length === 0 ? (
                <div className="p-8 text-center text-ink-muted">No activity yet. New leads, bookings and reviews will show up here.</div>
              ) : (
                <ul className="divide-y divide-line">
                  {activity.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-3">
                      <ActivityIcon kind={a.kind} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] text-ink">{a.label}</div>
                        <div className="text-[11px] text-ink-muted">{new Date(a.at).toLocaleString()}</div>
                      </div>
                      {a.href && (
                        <Link to={a.href.to as never} params={a.href.params as never} className="text-sun-700 hover:text-sun-800">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </StudioLayout>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-50 text-sun-700">{icon}</div>
      <div className="mt-3 font-display text-2xl font-extrabold text-ink">{value}</div>
      <div className="text-[12px] font-semibold text-ink-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
      <div className="font-display text-base font-extrabold text-ink">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyChart({ msg }: { msg: string }) {
  return <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-line bg-sun-50/40 px-6 text-center text-sm text-ink-muted">{msg}</div>;
}

function ActivityIcon({ kind }: { kind: Activity["kind"] }) {
  const map = {
    inquiry: <Inbox className="h-4 w-4" />,
    booking: <Calendar className="h-4 w-4" />,
    review: <Star className="h-4 w-4" />,
    application: <Briefcase className="h-4 w-4" />,
  } as const;
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-50 text-sun-700">{map[kind]}</div>;
}
