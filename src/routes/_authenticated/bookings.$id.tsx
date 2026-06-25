import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Loader2, FileText, Star, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { SunButton } from "@/components/sun/SunButton";
import { ReviewForm } from "@/components/sun/ReviewForm";
import { ContractView } from "@/components/sun/ContractView";
import { DeliverySection } from "@/components/sun/DeliverySection";
import { VerifiedPortfolioPicker } from "@/components/sun/VerifiedPortfolioPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { inr } from "@/lib/booking-config";
import { findOrCreateConversation } from "@/lib/messaging";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bookings/$id")({
  validateSearch: (s: Record<string, unknown>) => ({ pay: s.pay === "1" || s.pay === 1 ? 1 : undefined }),
  head: () => ({ meta: [{ title: "Booking — PhotoLancer" }] }),
  component: BookingDetailPage,
});

interface Booking {
  id: string;
  customer_id: string | null;
  photographer_id: string | null;
  inquiry_id: string | null;
  quote_id: string | null;
  event_date: string | null;
  amount: number | null;
  commission_amount: number | null;
  escrow_status: string;
  status: string;
  delivery_status: string;
  photographers: { business_name: string; slug: string; profile_id: string | null } | null;
  profiles: { full_name: string | null } | null;
}

interface Payment {
  id: string; amount: number | null; commission_amount: number | null;
  status: string; payout_status: string; gateway: string | null; gateway_ref: string | null;
}

const SUPABASE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callFn(name: string, body: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_FN_URL}/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "apikey": ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fireBookingConfirmed(b: Booking) {
  try {
    const { notify } = await import("@/lib/notify");
    const recipients: Array<{ user_id: string }> = [];
    if (b.customer_id) recipients.push({ user_id: b.customer_id });
    if (b.photographers?.profile_id) recipients.push({ user_id: b.photographers.profile_id });
    if (recipients.length === 0) return;
    notify({
      event: "booking_confirmed",
      recipients,
      data: { booking_id: b.id, event_date: b.event_date ?? null },
    });
  } catch { /* ignore */ }
}

declare global {
  interface Window { Razorpay?: any }
}

function BookingDetailPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [contract, setContract] = useState<any>(null);

  const load = useCallback(async () => {
    const { data: b } = await supabase
      .from("bookings")
      .select(`*, photographers(business_name, slug, profile_id),
               profiles!bookings_customer_id_fkey(full_name)`)
      .eq("id", id).maybeSingle();
    setBooking(b as any);
    const { data: p } = await supabase
      .from("payments").select("*").eq("booking_id", id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setPayment(p as any);
    const { data: rv } = await supabase
      .from("reviews").select("id").eq("booking_id", id).maybeSingle();
    setHasReview(!!rv);
    const { data: c } = await supabase
      .from("contracts").select("*").eq("booking_id", id).maybeSingle();
    setContract(c ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startPayment = useCallback(async () => {
    if (!booking) return;
    setBusy(true); setErr(null);
    try {
      const res = await callFn("create-payment", { booking_id: booking.id });
      const { order, simulated, key_id, payment_id } = res;
      if (simulated || !key_id) {
        // Simulated checkout — skip Razorpay UI
        await callFn("verify-payment", { payment_id, simulated: true });
        await fireBookingConfirmed(booking);
        load();
        navigate({ to: "/bookings/$id", params: { id: booking.id }, search: {} as any });
      } else {
        // Load Razorpay checkout dynamically
        if (!window.Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Razorpay"));
            document.body.appendChild(s);
          });
        }
        const rp = new window.Razorpay({
          key: key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.id,
          name: "PhotoLancer",
          description: booking.photographers?.business_name ?? "Photography booking",
          handler: async (resp: any) => {
            await callFn("verify-payment", {
              payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            await fireBookingConfirmed(booking);
            load();
            navigate({ to: "/bookings/$id", params: { id: booking.id }, search: {} as any });
          },
          theme: { color: "#FF7A1A" },
        });
        rp.open();
      }
    } catch (e: any) {
      setErr(e.message ?? "Payment failed");
    } finally {
      setBusy(false);
    }
  }, [booking, load, navigate]);

  useEffect(() => {
    if (search.pay === 1 && booking && booking.status === "pending" && !payment) {
      startPayment();
    }
  }, [search.pay, booking, payment, startPayment]);

  if (loading) return <Shell><div className="text-ink-muted">Loading…</div></Shell>;
  if (!booking) return <Shell><div>Booking not found.</div></Shell>;

  const isCustomer = user?.id === booking.customer_id;
  const isPhotographer = user?.id === booking.photographers?.profile_id;

  // Status timeline — delivery-protected escrow
  const today = new Date().toISOString().slice(0, 10);
  const eventDone = booking.status === "completed" || (booking.event_date != null && booking.event_date < today);
  const delivered = booking.delivery_status === "delivered";
  const inDelivery = booking.delivery_status === "in_progress" || booking.delivery_status === "disputed" || delivered;
  const steps = [
    { key: "requested", label: "Requested", done: true },
    { key: "quoted", label: "Quoted", done: !!booking.quote_id },
    { key: "booked", label: "Booked", done: booking.status === "confirmed" || booking.status === "completed" },
    { key: "event", label: "Event", done: eventDone },
    { key: "delivery", label: "Delivery", done: inDelivery },
    { key: "paidout", label: "Delivered & paid", done: booking.escrow_status === "released" },
    { key: "reviewed", label: "Reviewed", done: hasReview },
  ];

  return (
    <Shell>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-sun-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            Booking · {booking.photographers?.business_name}
          </h1>
          <p className="mt-1 text-ink-muted">Event date: {booking.event_date ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <SunButton
            variant="secondary"
            size="sm"
            onClick={async () => {
              const otherId = isPhotographer ? booking.customer_id : booking.photographers?.profile_id;
              if (!otherId) return;
              try {
                const cid = await findOrCreateConversation(otherId);
                navigate({ to: "/messages/$conversationId", params: { conversationId: cid } });
              } catch (e) { console.error(e); }
            }}
          >
            <MessageCircle className="h-4 w-4" /> Message
          </SunButton>
          <span className="rounded-full bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-sun-700">{booking.status}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-soft">
        <ol className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {steps.map((s, i) => (
            <li key={s.key} className="flex flex-col items-center gap-2 text-center">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold",
                s.done ? "bg-gradient-primary text-white" : "border border-line bg-white text-ink-muted",
              )}>
                {s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-[11px] font-bold uppercase tracking-wide", s.done ? "text-ink" : "text-ink-muted")}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Payment breakdown">
            <Row label="Booking amount" value={inr(booking.amount ?? 0)} bold />
            <Row label="Platform commission (10%)" value={`− ${inr(booking.commission_amount ?? 0)}`} />
            <Row label="Photographer payout" value={inr((booking.amount ?? 0) - (booking.commission_amount ?? 0))} bold />
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50/60 px-4 py-3 text-[13px] font-bold text-green-800">
              <ShieldCheck className="h-4 w-4" />
              Escrow status: {booking.escrow_status}
            </div>
            {booking.status === "pending" && isCustomer && (
              <SunButton className="mt-4 w-full" onClick={startPayment} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Pay {inr(booking.amount ?? 0)}
              </SunButton>
            )}
            {err && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          </Card>

          {contract ? (
            <ContractView
              contract={contract}
              side={isCustomer ? "a" : isPhotographer ? "b" : null}
              posterName={contract.gig_id ? "Hiring studio" : "Client"}
              freelancerName={booking.photographers?.business_name}
              onUpdated={load}
            />
          ) : (
            <Card title="Contract">
              <div className="flex items-center gap-3 rounded-xl bg-sun-50/60 px-4 py-3 text-[14px] text-ink">
                <FileText className="h-5 w-5 text-sun-700" />
                <span>A standard PhotoLancer contract will appear here once the booking is confirmed. <em className="text-ink-muted">(wired in a later phase)</em></span>
              </div>
            </Card>
          )}

          {booking.status !== "pending" && (
            <DeliverySection
              bookingId={booking.id}
              photographerName={booking.photographers?.business_name}
              photographerId={booking.photographer_id}
              customerId={booking.customer_id}
              isCustomer={isCustomer}
              isPhotographer={isPhotographer}
              onChange={load}
            />
          )}

          {delivered && isCustomer && (
            <Card title="How was it?">
              {hasReview ? (
                <p className="text-[14px] font-semibold text-green-700">Thanks — your review has been posted.</p>
              ) : (
                <>
                  <p className="text-ink-muted">Delivery is complete — leave a review for {booking.photographers?.business_name}.</p>
                  <SunButton className="mt-3" onClick={() => setReviewOpen(true)}>
                    <Star className="h-4 w-4" /> Leave a review
                  </SunButton>
                </>
              )}
            </Card>
          )}

          {delivered && isPhotographer && booking.photographer_id && (
            <VerifiedPortfolioPicker bookingId={booking.id} photographerId={booking.photographer_id} />
          )}

          {reviewOpen && user && booking.photographer_id && (
            <ReviewForm
              open={reviewOpen}
              onClose={() => setReviewOpen(false)}
              bookingId={booking.id}
              photographerId={booking.photographer_id}
              reviewerId={user.id}
              photographerName={booking.photographers?.business_name ?? "your photographer"}
              onSubmitted={() => { setHasReview(true); load(); }}
            />
          )}
        </div>

        <aside className="space-y-4">
          <Card title="Status">
            {booking.status === "pending" && (
              <p className="text-[13px] text-ink-muted">Awaiting payment.</p>
            )}
            {booking.status === "confirmed" && booking.delivery_status === "not_started" && (
              <p className="text-[13px] text-ink-muted">Payment secured in escrow. Delivery milestones will progress after the event.</p>
            )}
            {booking.delivery_status === "in_progress" && (
              <p className="text-[13px] text-ink-muted">Delivery is in progress. Escrow is held until you approve the full gallery.</p>
            )}
            {booking.delivery_status === "disputed" && (
              <p className="text-[13px] text-error font-semibold">A delivery issue was raised. Our team will help resolve it.</p>
            )}
            {delivered && booking.escrow_status === "released" && (
              <p className="text-[13px] text-green-700 font-semibold">Delivery complete — payout released to the photographer.</p>
            )}
          </Card>

          {payment && (
            <Card title="Payment">
              <Row label="Status" value={payment.status} />
              <Row label="Payout" value={payment.payout_status} />
              <Row label="Gateway" value={payment.gateway ?? "—"} />
            </Card>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8">{children}</main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-[14px]">
      <span className="text-ink-muted">{label}</span>
      <span className={cn(bold ? "font-display text-lg font-extrabold text-ink" : "font-semibold text-ink")}>{value}</span>
    </div>
  );
}
