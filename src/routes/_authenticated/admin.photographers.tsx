import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ExternalLink, BadgeCheck, Sparkles, Send, Eye, EyeOff, Mail } from "lucide-react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/photographers")({
  head: () => ({ meta: [{ title: "Photographers — Admin" }] }),
  component: PhotographersPage,
});

interface Row {
  id: string; business_name: string; slug: string; base_city: string | null;
  verified: boolean | null; featured: boolean | null; featured_until: string | null; rating_avg: number | null;
  claimed: boolean | null; is_published: boolean | null;
  invite_status: string | null; invited_at: string | null; claimed_at: string | null;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PhotographersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unclaimed" | "invited" | "claimed">("all");
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("photographers")
      .select("id, business_name, slug, base_city, verified, featured, featured_until, rating_avg, claimed, is_published, invite_status, invited_at, claimed_at")
      .order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term && !(r.business_name.toLowerCase().includes(term) || (r.base_city ?? "").toLowerCase().includes(term))) return false;
      if (filter === "unclaimed") return !r.claimed;
      if (filter === "invited") return r.invite_status === "invited" && !r.claimed;
      if (filter === "claimed") return r.claimed;
      return true;
    });
  }, [rows, q, filter]);

  const toggleVerify = async (r: Row) => {
    const next = !r.verified;
    await supabase.from("photographers").update({ verified: next, verification_source: next ? "India Photographers Club" : null }).eq("id", r.id);
    toast.success(next ? "Verified" : "Unverified"); load();
  };
  const toggleFeature = async (r: Row) => {
    const isFeat = !!(r.featured && r.featured_until && new Date(r.featured_until) > new Date());
    const newUntil = isFeat ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("photographers").update({ featured: !isFeat, featured_until: newUntil }).eq("id", r.id);
    toast.success(isFeat ? "Unfeatured" : "Featured for 30 days"); load();
  };
  const togglePublish = async (r: Row) => {
    const next = !r.is_published;
    const { error } = await supabase.from("photographers").update({ is_published: next }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? "Published" : "Unpublished"); load();
  };
  const sendInvite = async (r: Row) => {
    const { data, error } = await supabase.functions.invoke("invite-photographer", { body: { photographer_id: r.id } });
    if (error) { toast.error(error.message); return; }
    const sim = (data as { simulated?: boolean } | null)?.simulated;
    toast.success(sim ? "Invite logged (email simulated)" : "Invite sent");
    load();
  };
  const bulkInvite = async () => {
    const targets = rows.filter((r) => !r.claimed);
    if (targets.length === 0) { toast.info("No unclaimed photographers."); return; }
    if (!confirm(`Send invites to ${targets.length} unclaimed photographer${targets.length === 1 ? "" : "s"}?`)) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const r of targets) {
      try {
        const { error } = await supabase.functions.invoke("invite-photographer", { body: { photographer_id: r.id } });
        if (error) fail += 1; else ok += 1;
      } catch { fail += 1; }
    }
    setBulkBusy(false);
    toast.success(`Sent ${ok} invite${ok === 1 ? "" : "s"}${fail ? `, ${fail} failed` : ""}`);
    load();
  };

  return (
    <AdminLayout title="Photographers">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2 shadow-soft">
          <Search className="h-4 w-4 text-ink-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-white p-1 shadow-soft">
          {(["all", "unclaimed", "invited", "claimed"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold capitalize transition ${filter === k ? "bg-gradient-primary text-white" : "text-ink-muted hover:text-ink"}`}>
              {k}
            </button>
          ))}
        </div>
        <button
          onClick={bulkInvite}
          disabled={bulkBusy}
          className="inline-flex items-center gap-1.5 rounded-full border border-sun-300 bg-sun-50 px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider text-sun-800 shadow-soft hover:bg-sun-100 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> {bulkBusy ? "Sending…" : "Invite all unclaimed"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-line bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-sun-50/60 text-left text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Invite</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isFeat = !!(r.featured && r.featured_until && new Date(r.featured_until) > new Date());
              const invStatus = r.invite_status ?? "not_invited";
              const invLabel = r.claimed
                ? "Claimed"
                : invStatus === "invited"
                  ? "Invited"
                  : "Not invited";
              const invClass = r.claimed
                ? "bg-success/10 text-success"
                : invStatus === "invited"
                  ? "bg-sun-100 text-sun-800"
                  : "bg-line text-ink-muted";
              return (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold text-ink">{r.business_name}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.base_city ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${invClass}`}>{invLabel}</span>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {r.claimed
                        ? `Claimed ${fmtDate(r.claimed_at)}`
                        : invStatus === "invited"
                          ? `Sent ${fmtDate(r.invited_at)}`
                          : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.is_published ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success"><Eye className="h-3 w-3" /> Published</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-line px-2 py-0.5 text-[11px] font-bold text-ink-muted"><EyeOff className="h-3 w-3" /> Hidden</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.verified && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">Verified</span>}
                      {isFeat && <span className="rounded-full bg-gradient-primary px-2 py-0.5 text-[11px] font-bold text-white">Featured</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!r.claimed && (
                        <button onClick={() => sendInvite(r)} className="inline-flex items-center gap-1 rounded-full border border-sun-300 bg-sun-50 px-2.5 py-1 text-[11px] font-bold text-sun-800 hover:bg-sun-100">
                          <Mail className="h-3 w-3" /> {invStatus === "invited" ? "Resend invite" : "Send invite"}
                        </button>
                      )}
                      <button onClick={() => togglePublish(r)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300">
                        {r.is_published ? <><EyeOff className="h-3 w-3" /> Unpublish</> : <><Eye className="h-3 w-3" /> Publish</>}
                      </button>
                      <button onClick={() => toggleVerify(r)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300"><BadgeCheck className="h-3 w-3" /> {r.verified ? "Unverify" : "Verify"}</button>
                      <button onClick={() => toggleFeature(r)} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300"><Sparkles className="h-3 w-3" /> {isFeat ? "Unfeature" : "Feature"}</button>
                      <Link to="/p/$slug" params={{ slug: r.slug }} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold hover:border-sun-300"><ExternalLink className="h-3 w-3" /> View</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-muted">No photographers match.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
