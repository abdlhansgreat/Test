import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar as CalendarIcon,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Star,
  Clock,
  X,
  ImageOff,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SunButton } from "@/components/sun/SunButton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InquiryModal } from "@/components/sun/InquiryModal";
import { ReviewsSection } from "@/components/sun/ReviewsSection";
import { ReportImageButton } from "@/components/sun/ReportImageButton";
import { useAuth } from "@/lib/auth-context";
import { resolveMediaUrl } from "@/lib/media";
import { findOrCreateConversation } from "@/lib/messaging";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("photographers")
      .select("business_name, bio, base_city, starting_price, currency, rating_avg, review_count")
      .eq("slug", params.slug)
      .maybeSingle();
    return { photog: data ?? null };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.photog;
    const url = `https://photolancer.lovable.app/p/${params.slug}`;
    const name = p?.business_name ?? params.slug;
    const city = p?.base_city ?? "India";
    const title = `${name} — Photographer in ${city} | PhotoLancer`;
    const desc =
      (p?.bio?.slice(0, 155)) ||
      `Book ${name}, a verified photographer in ${city}. View portfolio, packages, and reviews on PhotoLancer.`;
    const price = p?.starting_price
      ? `${p.currency ?? "INR"} ${p.starting_price}+`
      : undefined;

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name,
      url,
      address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "IN" },
      image: "https://photolancer.lovable.app/icon-512.png",
    };
    if (price) jsonLd.priceRange = price;
    if (p?.rating_avg && p?.review_count) {
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(p.rating_avg).toFixed(1),
        reviewCount: p.review_count,
      };
    }
    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://photolancer.lovable.app/" },
        { "@type": "ListItem", position: 2, name: "Search", item: "https://photolancer.lovable.app/search" },
        { "@type": "ListItem", position: 3, name, item: url },
      ],
    };

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbs) },
      ],
    };
  },
  errorComponent: () => (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">Something went wrong</h1>
        <p className="mt-2 text-ink-muted">We couldn't load this profile. Please try again.</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">Photographer not found</h1>
        <p className="mt-2 text-ink-muted">This profile doesn't exist or was removed.</p>
        <Link to="/" className="mt-6 inline-block">
          <SunButton variant="secondary">Back home</SunButton>
        </Link>
      </div>
    </div>
  ),
  component: PublicProfile,
});

interface Photographer {
  id: string;
  profile_id: string;
  slug: string;
  business_name: string;
  bio: string | null;
  kind: string;
  base_city: string | null;
  service_cities: string[] | null;
  starting_price: number | null;
  day_rate: number | null;
  currency: string | null;
  available_for_second_shoots: boolean | null;
  years_experience: number | null;
  team_size: number | null;
  languages: string[] | null;
  equipment: string[] | null;
  instagram_handle: string | null;
  response_time_hours: number | null;
  verified: boolean | null;
  featured: boolean | null;
  featured_until: string | null;
  rating_avg: number | null;
  review_count: number | null;
}

interface Item {
  id: string;
  source: string;
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  position: number;
  verified?: boolean;
}
interface Pkg {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  duration: string | null;
  deliverables: string[] | null;
}
interface Genre { id: string; name: string; slug: string; }

function PublicProfile() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [photog, setPhotog] = useState<Photographer | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [resolved, setResolved] = useState<Record<string, string | null>>({});
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [saved, setSaved] = useState(false);
  const [savingHeart, setSavingHeart] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("photographers")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!p) { setNotFound(true); setLoading(false); return; }
      setPhotog(p as Photographer);
      // Fire-and-forget profile view tracking (RLS allows anon insert)
      void supabase.from("profile_views").insert({ photographer_id: p.id });
      if (user) {
        const { data: sv } = await supabase
          .from("saved_photographers")
          .select("id").eq("customer_id", user.id).eq("photographer_id", p.id).maybeSingle();
        setSaved(!!sv);
      }

      const [{ data: pg }, { data: it }, { data: pk }] = await Promise.all([
        supabase
          .from("photographer_genres")
          .select("genres(id, name, slug)")
          .eq("photographer_id", p.id),
        supabase
          .from("portfolio_items")
          .select("*")
          .eq("photographer_id", p.id)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("packages")
          .select("*")
          .eq("photographer_id", p.id)
          .order("price", { ascending: true, nullsFirst: false }),
      ]);

      const gs = (pg ?? []).map((r) => (r as { genres: Genre }).genres).filter(Boolean);
      setGenres(gs);
      const its = (it ?? []) as Item[];
      setItems(its);
      setPackages((pk ?? []) as Pkg[]);
      if (pk && pk.length) setSelectedPkg((pk[0] as Pkg).id);

      // resolve media urls (sign portfolio bucket paths)
      const map: Record<string, string | null> = {};
      await Promise.all(
        its.map(async (i) => {
          map[i.id] = await resolveMediaUrl(i.thumbnail_url ?? i.media_url, "portfolio");
        }),
      );
      setResolved(map);
      setLoading(false);
    })();
  }, [slug]);

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const galleryUrls = useMemo(
    () => items
      .filter((i) => (verifiedOnly ? !!i.verified : true))
      .map((i) => ({ id: i.id, url: resolved[i.id], caption: i.caption, verified: !!i.verified })),
    [items, resolved, verifiedOnly],
  );
  const verifiedCount = useMemo(() => items.filter((i) => i.verified).length, [items]);

  const coverUrl = galleryUrls.find((g) => g.url)?.url ?? null;

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const requireLogin = () => {
    if (!user) { navigate({ to: "/login" }); return; }
    setInquiryOpen(true);
  };
  const startConversation = async () => {
    if (!user) { navigate({ to: "/login" }); return; }
    if (!photog?.profile_id) return;
    try {
      const id = await findOrCreateConversation(photog.profile_id);
      navigate({ to: "/messages/$conversationId", params: { conversationId: id } });
    } catch (e) {
      console.error(e);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="font-display text-2xl font-extrabold text-ink">Photographer not found</h1>
          <p className="mt-2 text-ink-muted">This profile doesn't exist or was removed.</p>
          <Link to="/" className="mt-6 inline-block">
            <SunButton variant="secondary">Back home</SunButton>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading || !photog) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="mx-auto max-w-5xl px-5 py-16 text-ink-muted">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      {/* Cover */}
      <div className="relative">
        <div
          className="relative h-[280px] w-full overflow-hidden md:h-[420px]"
          style={
            coverUrl
              ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: "linear-gradient(135deg, #fff4dc 0%, #ffd591 45%, #ff8a2b 100%)" }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="-mt-16 grid gap-8 md:-mt-24 lg:grid-cols-[1fr_360px]">
          {/* LEFT */}
          <div>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-soft md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-[clamp(28px,4vw,40px)] font-extrabold leading-tight text-ink">
                      {photog.business_name}
                    </h1>
                    {photog.verified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-3 py-1 text-[12px] font-bold text-sun-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Community Verified
                      </span>
                    )}
                    {verifiedCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1 text-[12px] font-bold text-white shadow-soft">
                        <ShieldCheck className="h-3.5 w-3.5" /> {verifiedCount} verified shoot{verifiedCount === 1 ? "" : "s"} on PhotoLancer
                      </span>
                    )}
                    {photog.featured && photog.featured_until && new Date(photog.featured_until) > new Date() && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1 text-[12px] font-bold text-white shadow-soft">
                        <Sparkles className="h-3.5 w-3.5" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-sun-300 text-sun-300" />
                      <strong className="text-ink">{(photog.rating_avg ?? 0).toFixed(1)}</strong>
                      <span>({photog.review_count ?? 0} reviews)</span>
                    </span>
                    {photog.base_city && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {photog.base_city}
                      </span>
                    )}
                    {photog.response_time_hours != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> Responds in ~{photog.response_time_hours}h
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <SunButton variant="primary" onClick={startConversation}>
                    <MessageCircle className="h-4 w-4" /> Message
                  </SunButton>
                  <button
                    onClick={async () => {
                      if (!photog) return;
                      if (!user) { navigate({ to: "/auth" }); return; }
                      setSavingHeart(true);
                      try {
                        const { toggleSaved } = await import("@/lib/saved");
                        const next = await toggleSaved(user.id, photog.id, saved);
                        setSaved(next);
                      } finally { setSavingHeart(false); }
                    }}
                    disabled={savingHeart}
                    aria-label={saved ? "Unsave" : "Save"}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-white transition disabled:opacity-60 ${saved ? "border-sun-300 text-sun-600" : "border-line text-ink hover:border-sun-300 hover:bg-sun-50"}`}
                  >
                    <Heart className={`h-5 w-5 ${saved ? "fill-sun-600 text-sun-600" : ""}`} />
                  </button>
                </div>
              </div>

              {(genres.length > 0 || photog.available_for_second_shoots) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <span key={g.id} className="rounded-full border border-line bg-sun-50/60 px-3 py-1 text-[12px] font-semibold text-ink">
                      {g.name}
                    </span>
                  ))}
                  {photog.available_for_second_shoots && (
                    <span className="rounded-full bg-ink px-3 py-1 text-[12px] font-bold text-white">
                      Available for second shoots
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Portfolio gallery */}
            <section className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold text-ink">Portfolio</h2>
                {verifiedCount > 0 && (
                  <div className="inline-flex rounded-full border border-line bg-white p-1 text-[12px] font-bold">
                    <button
                      onClick={() => setVerifiedOnly(false)}
                      className={cn("rounded-full px-3 py-1", !verifiedOnly ? "bg-sun-50 text-sun-700" : "text-ink-muted")}
                    >All ({items.length})</button>
                    <button
                      onClick={() => setVerifiedOnly(true)}
                      className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1", verifiedOnly ? "bg-sun-50 text-sun-700" : "text-ink-muted")}
                    >
                      <ShieldCheck className="h-3 w-3" /> Verified only ({verifiedCount})
                    </button>
                  </div>
                )}
              </div>
              {items.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-line bg-sun-50/30 p-10 text-center text-ink-muted">
                  <ImageOff className="h-7 w-7" />
                  <p>No portfolio items yet.</p>
                </div>
              ) : galleryUrls.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-line bg-sun-50/30 p-8 text-center text-ink-muted">
                  No verified work yet — this photographer's first delivered bookings on PhotoLancer will appear here.
                </div>
              ) : (
                <div className="mt-4 columns-1 gap-3 sm:columns-2 lg:columns-3 [column-fill:_balance]">
                  {galleryUrls.map((g, i) => (
                    <div key={g.id} className="group relative mb-3 break-inside-avoid">
                      <button
                        onClick={() => setLightboxIdx(i)}
                        className="block w-full overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-warm"
                      >
                        {g.url ? (
                          <img src={g.url} alt={g.caption ?? ""} className="block w-full" loading="lazy" />
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center bg-sun-50 text-ink-muted">
                            <Globe className="h-6 w-6" />
                          </div>
                        )}
                      </button>
                      {g.verified && (
                        <span
                          title="Verified Work — shot on a real PhotoLancer booking"
                          className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-soft"
                        >
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
                        <ReportImageButton portfolioItemId={g.id} reporterId={user?.id ?? null} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Packages */}
            <section className="mt-12">
              <h2 className="font-display text-2xl font-extrabold text-ink">Packages</h2>
              {packages.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-line bg-sun-50/30 p-8 text-center text-ink-muted">
                  No packages listed yet.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {packages.map((p) => (
                    <div key={p.id} className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg font-extrabold text-ink">{p.title}</h3>
                        {p.price != null && (
                          <div className="font-display text-xl font-extrabold text-sun-700">
                            ₹{Number(p.price).toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                      {p.duration && <div className="mt-1 text-[13px] text-ink-muted">{p.duration}</div>}
                      {p.description && <p className="mt-3 text-[14px] text-ink-muted">{p.description}</p>}
                      {p.deliverables && p.deliverables.length > 0 && (
                        <ul className="mt-4 space-y-1.5 text-[14px] text-ink">
                          {p.deliverables.map((d, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Reviews */}
            <section className="mt-12">
              <h2 className="font-display text-2xl font-extrabold text-ink">Reviews</h2>
              <ReviewsSection
                photographerId={photog.id}
                ratingAvg={Number(photog.rating_avg ?? 0)}
                reviewCount={Number(photog.review_count ?? 0)}
              />
            </section>

            {/* About */}
            <section className="mt-12">
              <h2 className="font-display text-2xl font-extrabold text-ink">About</h2>
              <div className="mt-4 rounded-3xl border border-line bg-white p-6 shadow-soft md:p-8">
                {photog.bio ? (
                  <p className="text-[15px] leading-relaxed text-ink">{photog.bio}</p>
                ) : (
                  <p className="text-ink-muted">No bio yet.</p>
                )}
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  {photog.years_experience != null && (
                    <InfoRow label="Years of experience" value={`${photog.years_experience} yrs`} />
                  )}
                  {photog.team_size != null && (
                    <InfoRow label="Team size" value={`${photog.team_size}`} />
                  )}
                  {photog.languages && photog.languages.length > 0 && (
                    <InfoRow label="Languages" value={photog.languages.join(", ")} />
                  )}
                  {photog.equipment && photog.equipment.length > 0 && (
                    <InfoRow label="Equipment" value={photog.equipment.join(", ")} />
                  )}
                </dl>
              </div>
            </section>
          </div>

          {/* RIGHT: booking rail */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-warm">
              <div className="flex items-baseline gap-2">
                <span className="text-ink-muted text-[13px]">From</span>
                <span className="font-display text-3xl font-extrabold text-ink">
                  ₹{photog.starting_price ? Number(photog.starting_price).toLocaleString("en-IN") : "—"}
                </span>
              </div>

              {packages.length > 0 && (
                <div className="mt-5">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Package</label>
                  <div className="mt-2 space-y-2">
                    {packages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPkg(p.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                          selectedPkg === p.id
                            ? "border-sun-500 bg-sun-50"
                            : "border-line bg-white hover:border-sun-300",
                        )}
                      >
                        <span className="text-[14px] font-semibold text-ink">{p.title}</span>
                        {p.price != null && (
                          <span className="text-[13px] font-bold text-sun-700">
                            ₹{Number(p.price).toLocaleString("en-IN")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">Event date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "mt-2 flex w-full items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-left text-[14px] font-medium hover:border-sun-300",
                        !eventDate && "text-ink-muted",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      initialFocus
                      className="pointer-events-auto p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <SunButton variant="primary" className="mt-5 w-full" onClick={requireLogin}>
                Request a quote
              </SunButton>
              <p className="mt-2 text-center text-[12px] text-ink-muted">
                You'll only be charged when you confirm.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Footer />

      {/* Lightbox */}
      {lightboxIdx != null && galleryUrls[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {galleryUrls[lightboxIdx].verified && (
            <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1 text-[12px] font-bold text-white shadow-warm">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Work · Shot on PhotoLancer
            </span>
          )}
          {galleryUrls[lightboxIdx].url && (
            <img
              src={galleryUrls[lightboxIdx].url!}
              alt={galleryUrls[lightboxIdx].caption ?? ""}
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="absolute bottom-5 right-5" onClick={(e) => e.stopPropagation()}>
            <ReportImageButton portfolioItemId={galleryUrls[lightboxIdx].id} reporterId={user?.id ?? null} />
          </div>
        </div>
      )}

      <InquiryModal
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        photographerId={photog.id}
        photographerName={photog.business_name}
        defaultCity={photog.base_city}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-1 text-[14px] text-ink">{value}</dd>
    </div>
  );
}

