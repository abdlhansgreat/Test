import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, ShieldCheck, Loader2, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/sun/Navbar";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { calcCommission, inr } from "@/lib/booking-config";
import { findOrCreateConversation } from "@/lib/messaging";

export const Route = createFileRoute("/_authenticated/inquiries/$id")({
  head: () => ({ meta: [{ title: "Inquiry — PhotoLancer" }] }),
  component: InquiryDetailPage,
});

interface Inquiry {
  id: string;
  customer_id: string;
  photographer_id: string;
  event_type: string | null;
  event_date: string | null;
  city: string | null;
  budget: number | null;
  message: string | null;
  status: string;
  created_at: string;
  photographers: { business_name: string; slug: string; base_city: string | null; profile_id: string } | null;
  profiles: { full_name: string | null } | null;
}

interface Quote {
  id: string;
  amount: number;
  notes: string | null;
  status: string;
  package_id: string | null;
  created_at: string;
}

interface Package { id: string; title: string; price: number | null; }

function InquiryDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // photographer-side composer
  const [pickedPkg, setPickedPkg] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: i } = await supabase
      .from("inquiries")
      .select(`*,
        photographers(business_name, slug, base_city, profile_id),
        profiles!inquiries_customer_id_fkey(full_name)`)
      .eq("id", id)
      .maybeSingle();
    setInq(i as any);
    const { data: q } = await supabase
      .from("quotes")
      .select("*")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setQuote(q as any);
    if (i && (i as any).photographers) {
      const { data: pks } = await supabase
        .from("packages")
        .select("id, title, price")
        .eq("photographer_id", (i as any).photographer_id);
      setPackages((pks ?? []) as any);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Shell><div className="text-ink-muted">Loading…</div></Shell>;
  if (!inq) return <Shell><div>Inquiry not found.</div></Shell>;

  const isCustomer = user?.id === inq.customer_id;
  const isPhotographer = user?.id === inq.photographers?.profile_id;

  const sendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr("Enter an amount"); setBusy(false); return; }
    const { error } = await supabase.from("quotes").insert({
      inquiry_id: inq.id,
      package_id: pickedPkg || null,
      amount: amt,
      notes: notes || null,
    });
    if (!error) {
      await supabase.from("inquiries").update({ status: "quoted" }).eq("id", inq.id);
      try {
        const { notify } = await import("@/lib/notify");
        const { data: photog } = await supabase.from("photographers").select("business_name").eq("id", inq.photographer_id).maybeSingle();
        notify({
          event: "quote_received",
          recipients: [{ user_id: inq.customer_id }],
          data: { inquiry_id: inq.id, amount: amt, notes: notes || null, photographer_name: photog?.business_name ?? "Your photographer" },
        });
      } catch { /* ignore */ }
    }
    setBusy(false);
    if (error) setErr(error.message); else { setAmount(""); setNotes(""); setPickedPkg(""); load(); }
  };

  const declineQuote = async () => {
    if (!quote) return;
    setBusy(true);
    await supabase.from("quotes").update({ status: "declined" }).eq("id", quote.id);
    await supabase.from("inquiries").update({ status: "declined" }).eq("id", inq.id);
    setBusy(false); load();
  };

  const acceptAndPay = async () => {
    if (!quote || !user) return;
    setBusy(true); setErr(null);
    const commission = calcCommission(Number(quote.amount));
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        inquiry_id: inq.id,
        quote_id: quote.id,
        customer_id: user.id,
        photographer_id: inq.photographer_id,
        event_date: inq.event_date,
        amount: quote.amount,
        commission_amount: commission,
      })
      .select("id")
      .single();
    setBusy(false);
    if (bErr || !booking) { setErr(bErr?.message ?? "Could not create booking"); return; }
    navigate({ to: "/bookings/$id", params: { id: booking.id }, search: { pay: 1 } as any });
  };

  return (
    <Shell>
      <Link to="/inquiries" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-sun-700">
        <ArrowLeft className="h-4 w-4" /> Back to inquiries
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            {isPhotographer ? (inq.profiles?.full_name ?? "Customer") : inq.photographers?.business_name}
          </h1>
          <p className="mt-1 text-ink-muted">
            {inq.event_type ?? "Event"} · {inq.event_date ?? "no date"} · {inq.city ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SunButton
            variant="secondary"
            size="sm"
            onClick={async () => {
              const otherId = isPhotographer ? inq.customer_id : inq.photographers?.profile_id;
              if (!otherId) return;
              try {
                const cid = await findOrCreateConversation(otherId);
                navigate({ to: "/messages/$conversationId", params: { conversationId: cid } });
              } catch (e) { console.error(e); }
            }}
          >
            <MessageCircle className="h-4 w-4" /> Message
          </SunButton>
          <span className="rounded-full bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-sun-700">{inq.status}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Inquiry details">
            <Field label="Event type" value={inq.event_type ?? "—"} />
            <Field label="Event date" value={inq.event_date ?? "—"} />
            <Field label="City" value={inq.city ?? "—"} />
            <Field label="Budget" value={inr(inq.budget)} />
            {inq.message && (
              <div className="mt-3 rounded-xl bg-sun-50/60 p-4 text-[14px] text-ink">{inq.message}</div>
            )}
          </Card>

          {quote && (
            <Card title="Quote">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-display text-3xl font-extrabold text-ink">{inr(quote.amount)}</div>
                <span className="rounded-full bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase text-sun-700">{quote.status}</span>
              </div>
              {quote.notes && <p className="mt-2 text-[14px] text-ink-muted">{quote.notes}</p>}
              {isCustomer && quote.status === "sent" && (
                <div className="mt-5 rounded-xl bg-green-50/60 p-4">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-green-800">
                    <ShieldCheck className="h-4 w-4" />
                    Held safely in escrow — released to the photographer after your event.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SunButton onClick={acceptAndPay} disabled={busy}>
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      Accept &amp; Pay {inr(quote.amount)}
                    </SunButton>
                    <SunButton variant="secondary" onClick={declineQuote} disabled={busy}>Decline</SunButton>
                  </div>
                </div>
              )}
            </Card>
          )}

          {isPhotographer && (!quote || quote.status === "declined") && (
            <Card title="Send a quote">
              <form onSubmit={sendQuote} className="space-y-3">
                {packages.length > 0 && (
                  <label className="block">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Package (optional)</span>
                    <select
                      value={pickedPkg}
                      onChange={(e) => {
                        setPickedPkg(e.target.value);
                        const p = packages.find((x) => x.id === e.target.value);
                        if (p?.price) setAmount(String(p.price));
                      }}
                      className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Custom amount</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}{p.price ? ` — ${inr(p.price)}` : ""}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Amount (₹)</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={800}
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
                  />
                </label>
                {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
                <SunButton type="submit" disabled={busy}>
                  {busy ? "Sending…" : "Send quote"}
                </SunButton>
              </form>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card title="How payment works">
            <ol className="space-y-2 text-[14px] text-ink">
              <li>1. Photographer sends quote.</li>
              <li>2. You accept & pay — held in escrow.</li>
              <li>3. After the event, funds are released.</li>
              <li>4. We take a 10% commission only on confirmed bookings — never per lead.</li>
            </ol>
          </Card>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 grid grid-cols-[120px_1fr] gap-2 py-1.5 text-[14px]">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
