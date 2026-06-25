import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Instagram,
  Link as LinkIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  GripVertical,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StudioLayout } from "@/components/sun/StudioLayout";
import { SunButton } from "@/components/sun/SunButton";
import { resolveMediaUrl } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/studio/portfolio")({
  head: () => ({
    meta: [{ title: "Portfolio — PhotoLancer Studio" }],
  }),
  component: PortfolioManager,
});

interface Item {
  id: string;
  photographer_id: string;
  source: "instagram" | "upload" | "link";
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  position: number;
  verified?: boolean;
}

const MAX_UPLOADS = 20;

function PortfolioManager() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [photogId, setPhotogId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [linkValue, setLinkValue] = useState("");
  const [linkCaption, setLinkCaption] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const { data: p } = await supabase
        .from("photographers")
        .select("id")
        .eq("profile_id", u.user.id)
        .maybeSingle();
      if (!p) { navigate({ to: "/onboarding" }); return; }
      setPhotogId(p.id);
      await loadItems(p.id);
      setLoading(false);
    })();
  }, [navigate]);

  async function loadItems(pid: string) {
    const { data } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("photographer_id", pid)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    const its = (data ?? []) as Item[];
    setItems(its);
    const map: Record<string, string | null> = {};
    await Promise.all(
      its.map(async (i) => {
        map[i.id] = await resolveMediaUrl(i.thumbnail_url ?? i.media_url, "portfolio");
      }),
    );
    setUrls(map);
  }

  async function addLink() {
    if (!linkValue.trim() || !photogId) return;
    setSavingLink(true);
    const nextPos = items.length;
    const { error } = await supabase.from("portfolio_items").insert({
      photographer_id: photogId,
      source: "link",
      media_url: linkValue.trim(),
      thumbnail_url: linkValue.trim(),
      caption: linkCaption.trim() || null,
      position: nextPos,
    });
    setSavingLink(false);
    if (!error) {
      setLinkValue("");
      setLinkCaption("");
      await loadItems(photogId);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || !photogId || !userId) return;
    const uploads = items.filter((i) => i.source === "upload").length;
    const remaining = MAX_UPLOADS - uploads;
    if (remaining <= 0) {
      alert(`Upload limit reached (${MAX_UPLOADS} images).`);
      return;
    }
    setUploading(true);
    const arr = Array.from(files).slice(0, remaining);
    let pos = items.length;
    for (const file of arr) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("portfolio")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) continue;
      await supabase.from("portfolio_items").insert({
        photographer_id: photogId,
        source: "upload",
        media_url: path,
        thumbnail_url: path,
        caption: null,
        position: pos++,
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    await loadItems(photogId);
  }

  async function deleteItem(it: Item) {
    if (!confirm("Delete this item?")) return;
    if (it.source === "upload" && it.media_url && !/^https?:\/\//i.test(it.media_url)) {
      await supabase.storage.from("portfolio").remove([it.media_url]);
    }
    await supabase.from("portfolio_items").delete().eq("id", it.id);
    if (photogId) await loadItems(photogId);
  }

  // simple drag to reorder
  const dragId = useRef<string | null>(null);
  async function persistOrder(next: Item[]) {
    setItems(next);
    await Promise.all(
      next.map((it, idx) =>
        supabase.from("portfolio_items").update({ position: idx }).eq("id", it.id),
      ),
    );
  }
  function onDragStart(id: string) { dragId.current = id; }
  function onDrop(targetId: string) {
    if (!dragId.current || dragId.current === targetId) return;
    const from = items.findIndex((i) => i.id === dragId.current);
    const to = items.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next);
    dragId.current = null;
  }

  function connectInstagram() {
    // Optional integration scaffold. Wired in a later phase.
    alert(
      "Instagram Login (Business/Creator) coming soon.\n\nThis will start the Instagram API OAuth (scope: instagram_business_basic) and import your latest media into your portfolio.",
    );
  }

  if (loading) {
    return (
      <StudioLayout title="Portfolio">
        <div className="text-ink-muted">Loading portfolio…</div>
      </StudioLayout>
    );
  }

  const uploadCount = items.filter((i) => i.source === "upload").length;

  const verifiedCount = items.filter((i) => (i as Item & { verified?: boolean }).verified).length;

  return (
    <StudioLayout title="Portfolio">
      <div>
        <h1 className="mt-3 font-display text-[clamp(28px,4vw,40px)] font-extrabold text-ink">Portfolio</h1>
        <p className="mt-2 text-ink-muted">
          A hybrid portfolio — Instagram is optional. Upload highlights, paste links, or both.
        </p>

        <div className="mt-6 rounded-3xl border border-line bg-gradient-to-br from-sun-50 to-white p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-extrabold text-ink">Uploaded work vs. Verified Work</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-sun-700 ring-1 ring-sun-200">
                  {verifiedCount} verified
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-muted">
                Anything you upload or link here counts as your <strong>portfolio</strong>. To earn the
                <span className="mx-1 inline-flex items-center gap-1 align-middle rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold text-white"><ShieldCheck className="h-3 w-3" /> Verified Work</span>
                badge, link an image to a real, delivered PhotoLancer booking from your
                <Link to="/studio/deliverables" className="ml-1 font-semibold text-sun-700 hover:underline">Deliverables</Link>
                {" "}or directly from a completed booking. Verified work boosts your ranking and tells clients these are your own, delivered shots.
              </p>
            </div>
          </div>
        </div>


        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {/* Instagram */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-50 text-sun-700">
              <Instagram className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-ink">Connect Instagram</h3>
            <p className="mt-1 text-[13px] text-ink-muted">
              Requires an Instagram Business/Creator account. Optional.
            </p>
            <SunButton variant="secondary" className="mt-4 w-full" onClick={connectInstagram}>
              Connect Instagram
            </SunButton>
          </div>

          {/* Links */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-50 text-sun-700">
              <LinkIcon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-ink">Add portfolio links</h3>
            <p className="mt-1 text-[13px] text-ink-muted">
              Personal site, Pixieset, Behance, etc.
            </p>
            <input
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              placeholder="https://…"
              className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-sun-300"
            />
            <input
              value={linkCaption}
              onChange={(e) => setLinkCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-sun-300"
            />
            <SunButton variant="primary" className="mt-3 w-full" onClick={addLink} disabled={savingLink || !linkValue.trim()}>
              {savingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add link
            </SunButton>
          </div>

          {/* Upload */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-50 text-sun-700">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-ink">Upload highlights</h3>
            <p className="mt-1 text-[13px] text-ink-muted">
              {uploadCount}/{MAX_UPLOADS} curated images uploaded.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <SunButton
              variant="primary"
              className="mt-3 w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || uploadCount >= MAX_UPLOADS}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Choose images
            </SunButton>
          </div>
        </div>

        {/* Preview gallery */}
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold text-ink">All items</h2>
            <span className="text-[13px] text-ink-muted">Drag to reorder</span>
          </div>
          {items.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-line bg-sun-50/30 p-10 text-center text-ink-muted">
              Nothing here yet. Upload or add links to build your portfolio.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => (
                <div
                  key={it.id}
                  draggable
                  onDragStart={() => onDragStart(it.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(it.id)}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft"
                >
                  <div className="aspect-square w-full bg-sun-50">
                    {urls[it.id] ? (
                      <img src={urls[it.id]!} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-muted">
                        <LinkIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                    {it.source}
                  </span>
                  {(it as Item & { verified?: boolean }).verified && (
                    <span title="Verified Work — shot on a real PhotoLancer booking"
                      className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-soft">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 transition group-hover:opacity-100">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <button
                    onClick={() => deleteItem(it)}
                    className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft hover:bg-white"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudioLayout>
  );
}
