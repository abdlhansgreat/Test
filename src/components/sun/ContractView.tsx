import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SunButton } from "@/components/sun/SunButton";
import { Check, FileSignature, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractRow {
  id: string;
  gig_id: string | null;
  gig_application_id: string | null;
  booking_id: string | null;
  template_type: string | null;
  terms_json: any;
  copyright_terms: string | null;
  usage_terms: string | null;
  signed_by_a: boolean;
  signed_by_b: boolean;
  signed_at: string | null;
}

interface Props {
  contract: ContractRow;
  /** Which side is the current user? "a" = poster, "b" = freelancer */
  side: "a" | "b" | null;
  posterName?: string;
  freelancerName?: string;
  onUpdated?: () => void;
}

export function ContractView({ contract, side, posterName, freelancerName, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [terms, setTerms] = useState(contract.terms_json ?? {});
  const [copyright, setCopyright] = useState(contract.copyright_terms ?? "");
  const [usage, setUsage] = useState(contract.usage_terms ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [agreeName, setAgreeName] = useState("");

  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; due_date: string | null; is_final: boolean }>>([]);

  useEffect(() => {
    setTerms(contract.terms_json ?? {});
    setCopyright(contract.copyright_terms ?? "");
    setUsage(contract.usage_terms ?? "");
    if (contract.booking_id) {
      supabase.from("delivery_milestones")
        .select("id, title, due_date, is_final, position")
        .eq("booking_id", contract.booking_id)
        .order("position", { ascending: true })
        .then(({ data }) => setMilestones((data ?? []) as any));
    }
  }, [contract.id, contract.booking_id]);

  const fullySigned = contract.signed_by_a && contract.signed_by_b;

  const saveTerms = async () => {
    setBusy(true); setErr(null);
    const patch: any = {
      terms_json: terms,
      copyright_terms: copyright,
      usage_terms: usage,
      signed_by_a: side === "a" ? contract.signed_by_a : false,
      signed_by_b: side === "b" ? contract.signed_by_b : false,
      signed_at: null,
    };
    const { error } = await supabase.from("contracts").update(patch).eq("id", contract.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditing(false);
    onUpdated?.();
  };

  const sign = async () => {
    if (!side) return;
    if (!agreeName.trim()) { setErr("Type your full name to sign."); return; }
    setBusy(true); setErr(null);
    const patch: any =
      side === "a" ? { signed_by_a: true } : { signed_by_b: true };
    const otherSigned = side === "a" ? contract.signed_by_b : contract.signed_by_a;
    if (otherSigned) patch.signed_at = new Date().toISOString();
    const { error } = await supabase.from("contracts").update(patch).eq("id", contract.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setAgreeName("");
    onUpdated?.();
  };

  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sun-700">
          <FileSignature className="h-5 w-5" />
          <span className="font-display text-lg font-extrabold text-ink">Independent contractor agreement</span>
        </div>
        <div className="flex items-center gap-2">
          {fullySigned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-[12px] font-bold text-green-800">
              <Check className="h-3.5 w-3.5" /> Fully signed
            </span>
          ) : (
            <span className="rounded-full bg-sun-50 px-3 py-1 text-[12px] font-bold text-sun-700">Awaiting signatures</span>
          )}
          {side && !fullySigned && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink hover:border-sun-300 hover:bg-sun-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit terms
            </button>
          )}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-[14px] sm:grid-cols-2">
        <Row label="Role">{prettyRole(terms.role)}</Row>
        <Row label="Event date">{terms.event_date ?? "—"}</Row>
        <Row label="City">{terms.city ?? "—"}</Row>
        <Row label="Day rate">{terms.day_rate ? `₹${Number(terms.day_rate).toLocaleString("en-IN")}` : "—"}</Row>
      </dl>

      <Section title="Payment terms">
        {editing ? (
          <Textarea value={terms.payment_terms ?? ""} onChange={(v) => setTerms({ ...terms, payment_terms: v })} />
        ) : (
          <Body>{terms.payment_terms}</Body>
        )}
      </Section>

      <Section title="Copyright & deliverables">
        {editing ? (
          <Textarea value={copyright} onChange={setCopyright} />
        ) : (
          <Body>{copyright}</Body>
        )}
      </Section>

      <Section title="Portfolio & usage">
        {editing ? (
          <Textarea value={usage} onChange={setUsage} />
        ) : (
          <Body>{usage}</Body>
        )}
      </Section>

      <Section title="Cancellation">
        {editing ? (
          <Textarea value={terms.cancellation ?? ""} onChange={(v) => setTerms({ ...terms, cancellation: v })} />
        ) : (
          <Body>{terms.cancellation}</Body>
        )}
      </Section>

      <Section title="Governing law">
        {editing ? (
          <Textarea value={terms.governing_law ?? ""} onChange={(v) => setTerms({ ...terms, governing_law: v })} />
        ) : (
          <Body>{terms.governing_law}</Body>
        )}
      </Section>

      {milestones.length > 0 && (
        <Section title="Delivery milestones">
          <ul className="space-y-1.5 text-[14px] text-ink">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{m.title}{m.is_final && <span className="ml-2 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sun-800">Final</span>}</span>
                <span className="text-ink-muted">Due {m.due_date ?? "—"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-ink-muted">Payment is held in escrow and released to the photographer when the final milestone is approved.</p>
        </Section>
      )}


      {editing && (
        <div className="mt-4 flex justify-end gap-2">
          <SunButton variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</SunButton>
          <SunButton size="sm" onClick={saveTerms} disabled={busy}>{busy ? "Saving…" : "Save terms"}</SunButton>
        </div>
      )}

      {/* signatures */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SigBox name={posterName ?? "Hiring studio"} signed={contract.signed_by_a} />
        <SigBox name={freelancerName ?? "Freelancer"} signed={contract.signed_by_b} />
      </div>

      {side && !((side === "a" && contract.signed_by_a) || (side === "b" && contract.signed_by_b)) && !editing && (
        <div className="mt-5 rounded-2xl border border-line bg-sun-50/40 p-4">
          <label className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Type your full name to sign</label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={agreeName}
              onChange={(e) => setAgreeName(e.target.value)}
              placeholder="Your full name"
              className="h-10 flex-1 min-w-[200px] rounded-xl border border-line bg-white px-3 outline-none focus:border-sun-500"
            />
            <SunButton size="sm" onClick={sign} disabled={busy || !agreeName.trim()}>
              {busy ? "Signing…" : "I agree & sign"}
            </SunButton>
          </div>
          <p className="mt-2 text-[12px] text-ink-muted">By signing, you agree to all terms above. Both parties must sign for the contract to take effect.</p>
        </div>
      )}

      {err && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
    </div>
  );
}

function prettyRole(r: string | undefined) {
  if (!r) return "—";
  if (r === "second_shooter") return "Second shooter";
  if (r === "associate") return "Associate photographer";
  if (r === "cinematographer") return "Cinematographer";
  return r;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{children}</dd>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h4 className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{title}</h4>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-relaxed text-ink">{children || "—"}</p>;
}
function Textarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      rows={3} value={value} onChange={(e) => onChange(e.target.value)} maxLength={2000}
      className="w-full rounded-xl border border-line bg-white p-3 text-[14px] outline-none focus:border-sun-500"
    />
  );
}
function SigBox({ name, signed }: { name: string; signed: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4", signed ? "border-green-300 bg-green-50/50" : "border-dashed border-line bg-white")}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Signature</div>
      <div className="mt-1 font-display text-lg font-extrabold text-ink">{name}</div>
      <div className={cn("mt-1 text-[12px] font-bold", signed ? "text-green-700" : "text-ink-muted")}>
        {signed ? "Signed ✓" : "Not signed yet"}
      </div>
    </div>
  );
}
