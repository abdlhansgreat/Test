import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Post, formatPostDate, renderMarkdown, resolveCoverUrl } from "@/lib/posts";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { post: data as Post };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.post;
    const url = `https://photolancer.lovable.app/blog/${params.slug}`;
    const title = p ? `${p.title} — PhotoLancer` : "PhotoLancer";
    const desc = p?.excerpt ?? "";
    const cover = p?.cover_url && /^https?:\/\//.test(p.cover_url) ? p.cover_url : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(cover ? [{ property: "og:image", content: cover }, { name: "twitter:image", content: cover }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: p ? [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: p.title,
          description: p.excerpt ?? undefined,
          datePublished: p.published_at ?? undefined,
          author: p.author ? { "@type": "Person", name: p.author } : undefined,
          image: cover,
          mainEntityOfPage: url,
          publisher: { "@type": "Organization", name: "PhotoLancer" },
        }),
      }] : [],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-surface">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink">Post not found</h1>
        <Link to="/blog" className="mt-4 inline-block text-sun-700 underline">Back to blog</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-ink">{error.message}</div>
  ),
  component: PostPage,
});

function PostPage() {
  const { post } = Route.useLoaderData();
  const [cover, setCover] = useState<string | null>(null);
  const [related, setRelated] = useState<Post[]>([]);

  useEffect(() => { resolveCoverUrl(post.cover_url).then(setCover); }, [post.cover_url]);
  useEffect(() => {
    (async () => {
      const q = supabase.from("posts").select("*").eq("published", true).neq("id", post.id).limit(3);
      const { data } = post.category ? await q.eq("category", post.category) : await q;
      setRelated((data as Post[]) ?? []);
    })();
  }, [post.id, post.category]);

  const html = renderMarkdown(post.body ?? "");

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-6 md:px-8">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>

        <header className="mt-6">
          {post.category ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
              {post.category}
            </span>
          ) : null}
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] text-ink md:text-5xl">{post.title}</h1>
          {post.excerpt ? <p className="mt-4 text-[17px] leading-relaxed text-ink-muted">{post.excerpt}</p> : null}
          <div className="mt-5 flex items-center gap-3 text-[13px] text-ink-muted">
            {post.author ? <span className="font-bold text-ink">{post.author}</span> : null}
            <span>·</span>
            <time>{formatPostDate(post.published_at)}</time>
          </div>
        </header>

        {cover ? (
          <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
            <img src={cover} alt={post.title} className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : null}

        <article
          className="prose-post mt-10 text-[16.5px] leading-[1.75] text-ink/90 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-[26px] [&_h2]:font-extrabold [&_h2]:text-ink [&_h3]:mt-7 [&_h3]:font-display [&_h3]:text-[20px] [&_h3]:font-extrabold [&_h3]:text-ink [&_p]:mt-5 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-2 [&_strong]:text-ink [&_a]:text-sun-700 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-12 rounded-3xl bg-gradient-primary p-8 text-white shadow-warm">
          <h3 className="font-display text-2xl font-extrabold">Ready to find your photographer?</h3>
          <p className="mt-2 text-white/85">Browse verified photographers near you and book with escrow protection.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/search" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-sun-700 shadow-soft">
              <Search className="h-4 w-4" /> Browse photographers
            </Link>
            <Link to="/how-it-works" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
              How it works <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-extrabold text-ink">Related guides</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <RelatedCard key={r.id} post={r} />)}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

function RelatedCard({ post }: { post: Post }) {
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => { resolveCoverUrl(post.cover_url).then(setCover); }, [post.cover_url]);
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className="group overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-warm">
      <div className="aspect-[16/10] bg-sun-50">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
      </div>
      <div className="p-4">
        <h3 className="font-display text-[15.5px] font-extrabold leading-snug text-ink group-hover:text-sun-700">{post.title}</h3>
        {post.excerpt ? <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-muted">{post.excerpt}</p> : null}
      </div>
    </Link>
  );
}
