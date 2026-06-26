import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SunButton } from "@/components/sun/SunButton";
import { Package, Link as LinkIcon, CheckCircle2, AlertTriangle, Clock, Loader2, ExternalLink, Pencil, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { notify, userIdForPhotographer } from "@/lib/notify";

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

export interface Milestone {
  id: string;
  booking_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  position: number;
  is_final: boolean;
  status: "pending" | "submitted" | "approved" | "disputed";
  delivery_link: string | null;
  note: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  dispute_reason: string | null;
}

interface Props {
  bookingId: string;
  photographerName?: string;
  photographerId?: string | null;
  customerId?: string | null;
  isCustomer: boolean;
  isPhotographer: boolean;
  onChange?: () => void;
}

export function DeliverySection({ bookingId, photographerName, photographerId, customerId, isCustomer, isPhotographer, onChange }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitFor, setSubmitFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("delivery_milestones")
      .select("*")
      .eq("booking_id", bookingId)
      .order("position", { ascending: true });
    setMilestones((data ?? []) as Milestone[]);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const notifyCustomer = async (m: Milestone) => {
    if (!customerId) return;
    await notify({
      event: "new_message",
      recipients: [{ user_id: customerId }],
      data: {
        subject_override: `Your ${m.title} is ready — please review`,
        message: `${photographerName ?? "Your photographer"} just submitted "${m.title}". Open your booking to approve or raise an issue.`,
        link: `/bookings/${bookingId}`,
      },
    });
    await supabase.from("notifications").insert({
      user_id: customerId,
      type: "delivery_submitted",
      title: `Please review: ${m.title}`,
      body: `${photographerName ?? "Your photographer"} submitted the delivery — please approve or raise an issue.`,
      link: `/bookings/${bookingId}`,
    });
  };

  const notifyPhotographer = async (m: Milestone, type: "approved" | "disputed", reasonText?: string) => {
    let pgUserId: string | null = null;
    if (photographerId) pgUserId = await userIdForPhotographer(photographerId);
    if (!pgUserId) return;
    await supabase.from("notifications").insert({
      user_id: pgUserId,
      type: type === "approved" ? "delivery_approved" : "delivery_disputed",
      title: type === "approved" ? `Approved: ${m.title}` : `Issue raised on: ${m.title}`,
      body: type === "approved" ? "The customer approved your delivery." : `Customer raised an issue: ${reasonText ?? ""}`,
      link: `/bookings/${bookingId}`,
    });
  };

  const submitDelivery = async (m: Milestone) => {
    if (!link.trim()) { setErr("Please paste the gallery link."); return; }
    setBusyId(m.id); setErr(null);
    const { error } = await supabase.from("delivery_milestones").update({
      status: "submitted",
      delivery_link: link.trim(),
      note: note.trim() || null,
      submitted_at: new Date().toISOString(),
    }).eq("id", m.id);
    if (error) { setErr(error.message); setBusyId(null); return; }
    await supabase.from("bookings").update({ delivery_status: "in_progress" }).eq("id", bookingId);
    await notifyCustomer({ ...m, title: m.title });
    setSubmitFor(null); setLink(""); setNote(""); setBusyId(null);
    load(); onChange?.();
  };

  const approve = async (m: Milestone) => {
    setBusyId(m.id); setErr(null);
    await supabase.from("delivery_milestones").update({
      status: "approved",
      approved_at: new Date().toISOString(),
    }).eq("id", m.id);
    if (m.is_final) {
      try { await callFn("release-on-delivery", { booking_id: bookingId }); } catch (e: any) { setErr(e.message); }
      // Notify both
      const pgUserId = photographerId ? await userIdForPhotographer(photographerId) : null;
      const recipients: Array<{ user_id: string }> = [];
      if (customerId) recipients.push({ user_id: customerId });
      if (pgUserId) recipients.push({ user_id: pgUserId });
      await notify({
        event: "booking_confirmed",
        recipients,
        data: {
          subject_override: "Delivery complete — payment released",
          message: "The full gallery was approved and payment has been released to the photographer.",
          link: `/bookings/${bookingId}`,
        },
      });
      if (pgUserId) {
        await supabase.from("notifications").insert({
          user_id: pgUserId, type: "payout_released",
          title: "Payout released",
          body: "The customer approved the full gallery — your payout has been released.",
          link: `/bookings/${bookingId}`,
        });
      }
    } else {
      await notifyPhotographer(m, "approved");
    }
    setBusyId(null); load(); onChange?.();
  };

  const dispute = async (m: Milestone) => {
    if (!reason.trim()) { setErr("Please describe the issue."); return; }
    setBusyId(m.id); setErr(null);
    await supabase.from("delivery_milestones").update({
      status: "disputed",
      dispute_reason: reason.trim(),
    }).eq("id", m.id);
    await supabase.from("bookings").update({ delivery_status: "disputed" }).eq("id", bookingId);
    await notifyPhotographer(m, "disputed", reason.trim());
    setDisputeFor(null); setReason(""); setBusyId(null);
    load(); onChange?.();
  };

  const saveEdit = async (m: Milestone) => {
    if (!title.trim()) { setErr("Title is required."); return; }
    setBusyId(m.id); setErr(null);
    await supabase.from("delivery_milestones").update({
      title: title.trim(),
      due_date: due || null,
    }).eq("id", m.id);
    setEditFor(null); setBusyId(null);
    load(); onChange?.();
  };

  if (loading) {
    return <Card><div className="text-ink-muted">Loading delivery…</div></Card>;
  }

  if (milestones.length === 0) {
    return (
      <Card>
        <Empty />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 rounded-xl bg-sun-50/60 px-4 py-3 text-[13px] font-semibold text-sun-700">
        <ShieldCheck className="h-4 w-4" /> Payment is held in escrow until you approve the full gallery.
      </div>
      <ol className="mt-5 space-y-4">
        {milestones.map((m) => {
          const overdue = m.status === "pending" && m.due_date && m.due_date < new Date().toISOString().slice(0, 10);
          return (
            <li key={m.id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-extrabold text-ink">{m.title}</span>
                    {m.is_final && <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sun-800">Final</span>}
                    <StatusBadge status={m.status} overdue={!!overdue} />
                  </div>
                  {m.description && <p className="mt-1 text-[13px] text-ink-muted">{m.description}</p>}
                  <div className="mt-1 text-[12px] text-ink-muted">Due: {m.due_date ?? "—"}</div>
                  {m.delivery_link && (
                    <a href={m.delivery_link} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-sun-700 hover:underline">
                      <LinkIcon className="h-3.5 w-3.5" /> Open delivery <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {m.note && <p className="mt-1 text-[12px] text-ink-muted">Note: {m.note}</p>}
                  {m.dispute_reason && (
                    <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-700">
                      <strong>Issue:</strong> {m.dispute_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {isPhotographer && (m.status === "pending" || m.status === "disputed") && (
                    <>
                      <SunButton size="sm" onClick={() => { setSubmitFor(m.id); setLink(m.delivery_link ?? ""); setNote(""); }}>
                        <Package className="h-3.5 w-3.5" /> Submit delivery
                      </SunButton>
                      {m.status === "pending" && (
                        <button onClick={() => { setEditFor(m.id); setTitle(m.title); setDue(m.due_date ?? ""); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold hover:border-sun-300">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </>
                  )}
                  {isCustomer && m.status === "submitted" && (
                    <>
                      <SunButton size="sm" onClick={() => approve(m)} disabled={busyId === m.id}>
                        {busyId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve{m.is_final ? " & release payment" : ""}
                      </SunButton>
                      <button onClick={() => { setDisputeFor(m.id); setReason(""); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-error hover:border-error">
                        <AlertTriangle className="h-3 w-3" /> Raise an issue
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Submit form */}
              {submitFor === m.id && (
                <div className="mt-4 rounded-xl bg-sun-50/40 p-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Gallery / delivery link</label>
                  <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..."
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-sun-500" />
                  <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Note for customer (optional)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                    className="mt-1 w-full rounded-xl border border-line bg-white p-3 outline-none focus:border-sun-500" />
                  <div className="mt-3 flex justify-end gap-2">
                    <SunButton variant="secondary" size="sm" onClick={() => setSubmitFor(null)}>Cancel</SunButton>
                    <SunButton size="sm" onClick={() => submitDelivery(m)} disabled={busyId === m.id}>
                      {busyId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />} Submit
                    </SunButton>
                  </div>
                </div>
              )}

              {/* Edit form */}
              {editFor === m.id && (
                <div className="mt-4 rounded-xl bg-sun-50/40 p-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-sun-500" />
                  <label className="mt-3 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">Due date</label>
                  <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-sun-500" />
                  <div className="mt-3 flex justify-end gap-2">
                    <SunButton variant="secondary" size="sm" onClick={() => setEditFor(null)}>Cancel</SunButton>
                    <SunButton size="sm" onClick={() => saveEdit(m)} disabled={busyId === m.id}>Save</SunButton>
                  </div>
                </div>
              )}

              {/* Dispute form */}
              {disputeFor === m.id && (
                <div className="mt-4 rounded-xl bg-red-50/50 p-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-error">What's the issue?</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder="Be specific so the photographer can fix it quickly."
                    className="mt-1 w-full rounded-xl border border-line bg-white p-3 outline-none focus:border-sun-500" />
                  <div className="mt-3 flex justify-end gap-2">
                    <SunButton variant="secondary" size="sm" onClick={() => setDisputeFor(null)}>Cancel</SunButton>
                    <SunButton size="sm" onClick={() => dispute(m)} disabled={busyId === m.id}>Raise issue</SunButton>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {err && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <h2 className="font-display text-lg font-extrabold text-ink">Delivery</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-sun-50/40 p-6 text-center text-ink-muted">
      Delivery milestones appear here after payment is confirmed.
    </div>
  );
}

function StatusBadge({ status, overdue }: { status: Milestone["status"]; overdue: boolean }) {
  if (overdue) return <Badge className="bg-red-50 text-red-700"><Clock className="h-3 w-3" /> Overdue</Badge>;
  const map = {
    pending: { cls: "bg-ink/10 text-ink-muted", label: "Pending" },
    submitted: { cls: "bg-sun-100 text-sun-800", label: "Awaiting review" },
    approved: { cls: "bg-green-50 text-green-800", label: "Approved" },
    disputed: { cls: "bg-red-50 text-red-700", label: "Disputed" },
  } as const;
  const { cls, label } = map[status];
  return <Badge className={cls}>{label}</Badge>;
}
function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", className)}>{children}</span>;
}
