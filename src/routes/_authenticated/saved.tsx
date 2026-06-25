import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { CustomerLayout } from "@/components/sun/CustomerLayout";
import { PhotographerCard } from "@/components/sun/PhotographerCard";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toCardProps, type PhotographerResult } from "@/lib/photographer-search";
import { toggleSaved } from "@/lib/saved";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved photographers — PhotoLancer" }] }),
  component: SavedPage,
});

function SavedPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PhotographerResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("saved_photographers")
        .select(`photographer_id, created_at, photographers(
          id, slug, business_name, bio, kind, base_city, service_cities,
          starting_price, day_rate, currency, available_for_second_shoots,
          years_experience, languages, equipment, response_time_hours,
          verified, featured, featured_until, rating_avg, review_count, cover_url, is_demo,
          photographer_genres ( genres ( name, slug ) )
        )`)

        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      const mapped: PhotographerResult[] = (data ?? []).flatMap((row) => {
        const p = (row as { photographers: Record<string, unknown> | null }).photographers;
        if (!p) return [];
        const pg = (p.photographer_genres ?? []) as Array<{ genres: { name: string; slug: string } | null }>;
        return [{
          id: p.id as string,
          slug: p.slug as string,
          business_name: p.business_name as string,
          bio: (p.bio as string) ?? null,
          kind: (p.kind as string) ?? "individual",
          base_city: (p.base_city as string) ?? null,
          service_cities: (p.service_cities as string[] | null) ?? null,
          starting_price: (p.starting_price as number) ?? null,
          day_rate: (p.day_rate as number) ?? null,
          currency: (p.currency as string) ?? null,
          available_for_second_shoots: !!p.available_for_second_shoots,
          years_experience: (p.years_experience as number) ?? null,
          languages: (p.languages as string[]) ?? null,
          equipment: (p.equipment as string[]) ?? null,
          response_time_hours: (p.response_time_hours as number) ?? null,
          verified: !!p.verified,
          featured: !!p.featured,
          featured_until: (p.featured_until as string) ?? null,
          rating_avg: (p.rating_avg as number) ?? null,
          review_count: (p.review_count as number) ?? 0,
          genres: pg.map((g) => g.genres?.name).filter((s): s is string => !!s),
          verified_work_count: 0,
          cover_url: (p.cover_url as string) ?? null,
          is_demo: !!p.is_demo,
        }];
      });

      setRows(mapped);
      setLoading(false);
    })();
  }, [user]);

  const handleRemove = async (id: string) => {
    if (!user) return;
    try {
      await toggleSaved(user.id, id, true);
      setRows((rs) => rs.filter((r) => r.id !== id));
      toast.success("Removed");
    } catch (e) {
      toast.error((e as Error).message ?? "Couldn't remove");
    }
  };

  return (
    <CustomerLayout title="Saved">
      <h1 className="font-display text-3xl font-extrabold text-ink">Saved photographers</h1>
      <p className="mt-1 text-ink-muted">Your personal shortlist — message or revisit any time.</p>

      {loading ? (
        <div className="mt-8 text-ink-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line bg-sun-50/40 p-12 text-center">
          <Heart className="h-8 w-8 text-sun-600" />
          <h2 className="font-display text-xl font-extrabold text-ink">You haven't saved any photographers yet</h2>
          <p className="text-ink-muted">Tap the heart on a profile to start building your shortlist.</p>
          <Link to="/search" className="mt-2"><SunButton>Start exploring →</SunButton></Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <PhotographerCard
              key={r.id}
              {...toCardProps(r)}
              initialSaved
              showRemove
              onRemove={() => handleRemove(r.id)}
            />
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
