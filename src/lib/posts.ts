import { supabase } from "@/integrations/supabase/client";

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  category: string | null;
  author: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Resolve a stored cover_url. May be:
 *  - http(s) absolute URL → returned as-is
 *  - a storage path in `post-covers` → signed URL
 */
export async function resolveCoverUrl(coverUrl: string | null | undefined): Promise<string | null> {
  if (!coverUrl) return null;
  if (/^https?:\/\//i.test(coverUrl)) return coverUrl;
  const { data } = await supabase.storage.from("post-covers").createSignedUrl(coverUrl, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

/** Tiny markdown → HTML renderer (headings, bold, italic, lists, paragraphs, links). */
export function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    let text = esc(para.join(" "));
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
    out.push(`<p>${text}</p>`);
    para = [];
  };
  const closeLists = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); closeLists(); continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flushPara(); closeLists();
      const lvl = Math.min(h[1].length + 1, 6);
      out.push(`<h${lvl}>${esc(h[2])}</h${lvl}>`);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      let t = esc(ul[1]).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
      out.push(`<li>${t}</li>`);
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      let t = esc(ol[1]).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
      out.push(`<li>${t}</li>`);
      continue;
    }
    para.push(line);
  }
  flushPara(); closeLists();
  return out.join("\n");
}

export function formatPostDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
