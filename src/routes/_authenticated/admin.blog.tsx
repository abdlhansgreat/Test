import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/sun/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Post, slugify } from "@/lib/posts";
import { Pencil, Plus, Trash2, Eye, EyeOff, ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    new: s.new === true || s.new === "true" ? true : undefined,
  }),
  component: AdminBlogPage,
});

function AdminBlogPage() {
  const search = Route.useSearch();
  if (search.edit || search.new) return <PostEditor postId={search.edit} />;
  return <PostList />;
}

function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const togglePublish = async (p: Post) => {
    const next = !p.published;
    const { error } = await supabase
      .from("posts")
      .update({ published: next, published_at: next ? new Date().toISOString() : null })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Published" : "Unpublished");
    load();
  };

  const remove = async (p: Post) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <AdminLayout title="Blog">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Blog & guides</h1>
          <p className="text-ink-muted">Publish SEO content that brings clients in.</p>
        </div>
        <Link
          to="/admin/blog"
          search={{ new: true } as any}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft"
        >
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-line bg-white" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <div className="font-display text-xl font-extrabold text-ink">No posts yet</div>
          <p className="mt-1 text-ink-muted">Write your first guide to start ranking on search.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-sun-50 text-left text-[12px] uppercase tracking-wider text-sun-700">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-bold text-ink">{p.title}</div>
                    <div className="text-[12px] text-ink-muted">/blog/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{p.category || "—"}</td>
                  <td className="px-4 py-3">
                    {p.published ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Published</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => togglePublish(p)} className="rounded-lg border border-line bg-white p-2 hover:bg-sun-50" aria-label="Toggle publish">
                        {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <Link
                        to="/admin/blog"
                        search={{ edit: p.id } as any}
                        className="rounded-lg border border-line bg-white p-2 hover:bg-sun-50"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(p)} className="rounded-lg border border-line bg-white p-2 text-rose-600 hover:bg-rose-50" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

function PostEditor({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Partial<Post>>({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    cover_url: "",
    category: "Guides",
    author: "PhotoLancer Editorial",
    published: false,
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
      if (error) toast.error(error.message);
      if (data) { setForm(data as Post); setSlugTouched(true); }
      setLoading(false);
    })();
  }, [postId]);

  const set = (k: keyof Post, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const onTitle = (t: string) => {
    set("title", t);
    if (!slugTouched) set("slug", slugify(t));
  };

  const onUploadCover = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, "") || "cover")}.${ext}`;
    const { error } = await supabase.storage.from("post-covers").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) return toast.error(error.message);
    set("cover_url", path);
    toast.success("Cover uploaded");
  };

  const save = async (publishNow?: boolean) => {
    if (!form.title?.trim() || !form.slug?.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    setSaving(true);
    const published = publishNow ?? form.published ?? false;
    const payload = {
      title: form.title!.trim(),
      slug: form.slug!.trim(),
      excerpt: form.excerpt?.trim() || null,
      body: form.body || null,
      cover_url: form.cover_url?.trim() || null,
      category: form.category?.trim() || null,
      author: form.author?.trim() || null,
      published,
      published_at: published ? (form.published_at ?? new Date().toISOString()) : null,
    };
    const q = postId
      ? supabase.from("posts").update(payload).eq("id", postId)
      : supabase.from("posts").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    navigate({ to: "/admin/blog", search: {} as any });
  };

  if (loading) return <AdminLayout title="Blog"><div className="h-64 animate-pulse rounded-3xl bg-white" /></AdminLayout>;

  return (
    <AdminLayout title="Blog">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/admin/blog" search={{} as any} className="inline-flex items-center gap-2 text-sm font-bold text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All posts
        </Link>
        <div className="flex gap-2">
          <button onClick={() => save(false)} disabled={saving} className="rounded-full border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink hover:bg-sun-50 disabled:opacity-50">Save draft</button>
          <button onClick={() => save(true)} disabled={saving} className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft disabled:opacity-50">{form.published ? "Update & keep live" : "Publish"}</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-4 rounded-3xl border border-line bg-white p-6 shadow-soft">
          <Field label="Title">
            <input value={form.title ?? ""} onChange={(e) => onTitle(e.target.value)} className="input" placeholder="How much does a wedding photographer cost in India in 2026?" />
          </Field>
          <Field label="Slug" hint="URL: /blog/your-slug">
            <input
              value={form.slug ?? ""}
              onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
              className="input font-mono"
            />
          </Field>
          <Field label="Excerpt" hint="1–2 sentence summary shown on cards and in search snippets.">
            <textarea value={form.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} rows={2} className="input" />
          </Field>
          <Field label="Body" hint="Markdown supported: # headings, **bold**, *italic*, - lists, 1. lists, [links](url).">
            <textarea value={form.body ?? ""} onChange={(e) => set("body", e.target.value)} rows={20} className="input font-mono text-[13.5px]" />
          </Field>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
            <h3 className="font-display text-base font-extrabold text-ink">Cover image</h3>
            {form.cover_url ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-sun-50">
                <CoverPreview path={form.cover_url} />
              </div>
            ) : null}
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-sun-50/60 px-4 py-3 text-sm font-bold text-ink hover:border-sun-300 hover:bg-sun-50">
              <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload cover"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadCover(f); }} />
            </label>
            <input
              value={form.cover_url ?? ""}
              onChange={(e) => set("cover_url", e.target.value)}
              placeholder="…or paste an https:// URL"
              className="input mt-2 text-[13px]"
            />
          </div>
          <div className="space-y-3 rounded-3xl border border-line bg-white p-6 shadow-soft">
            <Field label="Category"><input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} className="input" /></Field>
            <Field label="Author"><input value={form.author ?? ""} onChange={(e) => set("author", e.target.value)} className="input" /></Field>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-sun-50/50 px-3 py-2.5">
              <div>
                <div className="text-sm font-bold text-ink">Published</div>
                <div className="text-[12px] text-ink-muted">Visible at /blog/{form.slug || "…"}</div>
              </div>
              <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} />
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .input { width:100%; border:1px solid hsl(var(--line)); background:white; border-radius:14px; padding:10px 12px; font-size:14px; color:hsl(var(--ink)); }
        .input:focus { outline: 2px solid hsl(var(--sun-300)); outline-offset: 1px; }
      `}</style>
    </AdminLayout>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-extrabold uppercase tracking-wider text-sun-700">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-[12px] text-ink-muted">{hint}</div> : null}
    </label>
  );
}

function CoverPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (/^https?:\/\//.test(path)) { setUrl(path); return; }
    (async () => {
      const { data } = await supabase.storage.from("post-covers").createSignedUrl(path, 3600);
      setUrl(data?.signedUrl ?? null);
    })();
  }, [path]);
  if (!url) return <div className="aspect-[16/9] animate-pulse bg-sun-100" />;
  return <img src={url} alt="" className="aspect-[16/9] w-full object-cover" />;
}
