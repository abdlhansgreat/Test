import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search, MessageSquare, Calendar, Heart, Inbox, Wallet,
  ArrowRight, FileText, Package,
} from "lucide-react";
import { CustomerLayout } from "@/components/sun/CustomerLayout";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — PhotoLancer" },
      { name: "description", content: "Your inquiries, bookings, saved photographers and conversations." },
    ],
  }),
  component: DashboardPage,
});

type Activity = { id: string; kind: "inquiry" | "quote" | "booking" | "message"; label: string; at: string; href?: { to: string; params: Record<string, string> } };

function DashboardPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ upcoming: 0, openInquiries: 0, saved: 0, unread: 0 });
  const [recentInquiries, setRecentInquiries] = useState<Array<{ id: string; status: string; event_type: string | null; event_date: string | null; photographers: { business_name: string } | null }>>([]);
  const [awaitingReview, setAwaitingReview] = useState<Array<{ id: string; booking_id: string; title: string; is_final: boolean; photographer_name: string }>>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [
        upcomingRes, openInqRes, savedRes, convsRes,
        recentInqRes, quotesRes, recentBkRes,
      ] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", user.id).eq("status", "confirmed").gte("event_date", today),
        supabase.from("inquiries").select("id, status, event_type, event_date, created_at, photographers(business_name)").eq("customer_id", user.id).in("status", ["new", "quoted"]).order("created_at", { ascending: false }),
        supabase.from("saved_photographers").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
        supabase.from("conversations").select("id").or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`),
        supabase.from("inquiries").select("id, status, event_type, event_date, created_at, photographers(business_name)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("quotes").select("id, inquiry_id, total, created_at, inquiries!inner(customer_id, photographers(business_name))").eq("inquiries.customer_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("bookings").select("id, event_date, created_at, photographers(business_name)").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      let unread = 0;
      const convIds = (convsRes.data ?? []).map((c) => c.id);
      if (convIds.length) {
        const { count } = await supabase
          .from("messages").select("id", { count: "exact", head: true })
          .in("conversation_id", convIds).neq("sender_id", user.id).eq("read", false);
        unread = count ?? 0;
      }

      setStats({
        upcoming: upcomingRes.count ?? 0,
        openInquiries: (openInqRes.data ?? []).length,
        saved: savedRes.count ?? 0,
        unread,
      });
      setRecentInquiries((openInqRes.data ?? []).slice(0, 5) as unknown as typeof recentInquiries);

      const acts: Activity[] = [];
      for (const r of (recentInqRes.data ?? []) as unknown as Array<{ id: string; status: string; event_type: string | null; created_at: string; photographers: { business_name: string } | null }>) {
        acts.push({ id: `i-${r.id}`, kind: "inquiry", at: r.created_at, label: `Inquiry to ${r.photographers?.business_name ?? "photographer"}${r.event_type ? ` · ${r.event_type}` : ""} — ${r.status}`, href: { to: "/inquiries/$id", params: { id: r.id } } });
      }
      for (const r of (quotesRes.data ?? []) as unknown as Array<{ id: string; inquiry_id: string; total: number; created_at: string; inquiries: { photographers: { business_name: string } | null } | null }>) {
        acts.push({ id: `q-${r.id}`, kind: "quote", at: r.created_at, label: `Quote received from ${r.inquiries?.photographers?.business_name ?? "a photographer"} — ${inr(r.total)}`, href: { to: "/inquiries/$id", params: { id: r.inquiry_id } } });
      }
      for (const r of (recentBkRes.data ?? []) as unknown as Array<{ id: string; event_date: string | null; created_at: string; photographers: { business_name: string } | null }>) {
        acts.push({ id: `b-${r.id}`, kind: "booking", at: r.created_at, label: `Booking with ${r.photographers?.business_name ?? "photographer"}${r.event_date ? ` · ${r.event_date}` : ""}`, href: { to: "/bookings/$id", params: { id: r.id } } });
      }
      acts.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setActivity(acts.slice(0, 10));

      // Delivery milestones awaiting customer review
      const { data: myBookings } = await supabase.from("bookings").select("id, photographers(business_name)").eq("customer_id", user.id);
      const bIds = (myBookings ?? []).map((b) => b.id);
      if (bIds.length) {
        const { data: ms } = await supabase
          .from("delivery_milestones")
          .select("id, booking_id, title, is_final")
          .in("booking_id", bIds)
          .eq("status", "submitted");
        const nameByBooking = new Map((myBookings ?? []).map((b: any) => [b.id, b.photographers?.business_name ?? "your photographer"]));
        setAwaitingReview((ms ?? []).map((m) => ({ id: m.id, booking_id: m.booking_id, title: m.title, is_final: !!m.is_final, photographer_name: nameByBooking.get(m.booking_id) ?? "your photographer" })));
      }

      setLoading(false);
    })();
  }, [user]);

  return (
    <CustomerLayout title="Overview">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(24px,3.5vw,38px)] font-extrabold text-ink">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-ink-muted">Your inquiries, quotes and bookings — all in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/search"><SunButton><Search className="h-4 w-4" /> Find photographers</SunButton></Link>
          <Link to="/saved"><SunButton variant="secondary"><Heart className="h-4 w-4" /> View saved</SunButton></Link>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 text-ink-muted">Loading your dashboard…</div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Calendar className="h-5 w-5" />} label="Upcoming bookings" value={String(stats.upcoming)} />
            <Stat icon={<Inbox className="h-5 w-5" />} label="Open inquiries" value={String(stats.openInquiries)} />
            <Stat icon={<Heart className="h-5 w-5" />} label="Saved" value={String(stats.saved)} />
            <Stat icon={<MessageSquare className="h-5 w-5" />} label="Unread messages" value={String(stats.unread)} />
          </div>

          {awaitingReview.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl font-extrabold text-ink">Awaiting your review</h2>
              <div className="mt-3 space-y-3">
                {awaitingReview.map((m) => (
                  <Link key={m.id} to="/bookings/$id" params={{ id: m.booking_id }}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-sun-300 bg-sun-50/60 p-4 shadow-soft hover:border-sun-500">
                    <div className="flex items-center gap-3 min-w-0">
                      <Package className="h-5 w-5 shrink-0 text-sun-700" />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-ink">{m.title}{m.is_final && <span className="ml-2 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sun-800">Final · releases payment</span>}</div>
                        <div className="text-[13px] text-ink-muted">From {m.photographer_name} — approve or raise an issue.</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-sun-700" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-xl font-extrabold text-ink">Open inquiries</h2>
              <Link to="/inquiries" className="text-sm font-semibold text-sun-700 hover:underline">All inquiries →</Link>
            </div>
            <div className="mt-3 space-y-3">
              {recentInquiries.length === 0 ? (
                <Empty
                  icon={<FileText className="h-7 w-7 text-sun-600" />}
                  title="No open inquiries"
                  msg="Reach out to a photographer to request a quote."
                  cta={<Link to="/search"><SunButton>Find a photographer</SunButton></Link>}
                />
              ) : recentInquiries.map((r) => (
                <Link key={r.id} to="/inquiries/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft hover:border-sun-300">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-ink">{r.photographers?.business_name ?? "—"}</div>
                    <div className="text-[13px] text-ink-muted">{r.event_type ?? "—"} · {r.event_date ?? "no date"}</div>
                  </div>
                  <span className="rounded-full bg-sun-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-sun-700">{r.status}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold text-ink">Recent activity</h2>
            <div className="mt-3 rounded-3xl border border-line bg-white p-3 shadow-soft">
              {activity.length === 0 ? (
                <div className="p-8 text-center text-ink-muted">No activity yet — your inquiries, quotes and bookings will appear here.</div>
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
    </CustomerLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-50 text-sun-700">{icon}</div>
      <div className="mt-3 font-display text-2xl font-extrabold text-ink">{value}</div>
      <div className="text-[12px] font-semibold text-ink-muted">{label}</div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: Activity["kind"] }) {
  const map = {
    inquiry: <Inbox className="h-4 w-4" />,
    quote: <Wallet className="h-4 w-4" />,
    booking: <Calendar className="h-4 w-4" />,
    message: <MessageSquare className="h-4 w-4" />,
  } as const;
  return <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-50 text-sun-700">{map[kind]}</div>;
}

function Empty({ icon, title, msg, cta }: { icon: React.ReactNode; title: string; msg: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-line bg-sun-50/40 p-10 text-center">
      {icon}
      <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="text-sm text-ink-muted">{msg}</p>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
