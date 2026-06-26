import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Post, formatPostDate, resolveCoverUrl } from "@/lib/posts";
import { BookOpen, ArrowRight } from "lucide-react";

const URL = "https://photolancer.lovable.app/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Guides & blog — PhotoLancer" },
      { name: "description", content: "Honest guides to hiring photographers in India — wedding pricing, what to ask, candid vs traditional, and more." },
      { property: "og:title", content: "Guides & blog — PhotoLancer" },
      { property: "og:description", content: "Honest guides to hiring photographers in India." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>("All");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    posts.forEach((p) => p.category && s.add(p.category));
    return ["All", ...Array.from(s)];
  }, [posts]);

  const visible = active === "All" ? posts : posts.filter((p) => p.category === active);

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-6 md:px-8">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun-200 bg-sun-50 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-sun-700">
            <BookOpen className="h-3.5 w-3.5" /> Guides
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink md:text-5xl">
            Hire smarter. Shoot better.
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-ink-muted">
            Plain-English guides for couples, families and businesses booking a photographer in India — written by working pros.
          </p>
        </header>

        {categories.length > 1 ? (
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  active === c
                    ? "border-transparent bg-gradient-primary text-white shadow-soft"
                    : "border-line bg-white text-ink hover:border-sun-300 hover:bg-sun-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <section className="mt-10">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[360px] animate-pulse rounded-3xl border border-line bg-white" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white p-16 text-center">
      <div className="font-display text-2xl font-extrabold text-ink">More guides coming soon</div>
      <p className="mt-2 text-ink-muted">We're writing honest, useful content for clients and photographers. Check back shortly.</p>
      <Link to="/search" className="mt-5 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft">
        Browse photographers
      </Link>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => { resolveCoverUrl(post.cover_url).then(setCover); }, [post.cover_url]);
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-warm"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-sun-50">
        {cover ? (
          <img src={cover} alt={post.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-sun-300"><BookOpen className="h-10 w-10" /></div>
        )}
        {post.category ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700 shadow-soft">
            {post.category}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[19px] font-extrabold leading-snug text-ink group-hover:text-sun-700">{post.title}</h3>
        {post.excerpt ? <p className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-ink-muted">{post.excerpt}</p> : null}
        <div className="mt-4 flex items-center justify-between text-[12.5px] text-ink-muted">
          <span>{formatPostDate(post.published_at)}</span>
          <span className="inline-flex items-center gap-1 font-bold text-sun-700">Read <ArrowRight className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </Link>
  );
}
