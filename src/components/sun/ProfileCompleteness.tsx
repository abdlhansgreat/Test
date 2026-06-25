import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface Step { key: string; label: string; done: boolean; to: string }

export function ProfileCompleteness() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: photog } = await supabase
        .from("photographers")
        .select("id, bio, starting_price, service_cities")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (!photog) { setSteps(null); return; }
      const pid = photog.id as string;
      const [portfolioRes, pkgRes, availRes] = await Promise.all([
        supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("photographer_id", pid),
        supabase.from("packages").select("id", { count: "exact", head: true }).eq("photographer_id", pid),
        supabase.from("availability").select("id", { count: "exact", head: true }).eq("photographer_id", pid),
      ]);

      const bioDone = !!(photog.bio && (photog.service_cities?.length ?? 0) > 0);
      const built: Step[] = [
        { key: "bio", label: "Write your bio & set your service cities", done: bioDone, to: "/onboarding" },
        { key: "portfolio", label: "Add at least 6 portfolio photos", done: (portfolioRes.count ?? 0) >= 6, to: "/studio/portfolio" },
        { key: "packages", label: "Set up pricing packages", done: (pkgRes.count ?? 0) >= 1 || !!photog.starting_price, to: "/studio/packages" },
        { key: "availability", label: "Mark your availability", done: (availRes.count ?? 0) >= 1, to: "/studio/availability" },
      ];
      setSteps(built);
    })();
  }, [user]);

  if (!steps || steps.length === 0) return null;
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  if (pct >= 100) return null;

  return (
    <section className="mt-8 rounded-3xl border border-sun-300/60 bg-gradient-to-br from-sun-50 to-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700 ring-1 ring-sun-300/60">
            <Sparkles className="h-3.5 w-3.5" /> Finish setting up
          </span>
          <h2 className="mt-3 font-display text-xl font-extrabold text-ink">Your studio is {pct}% ready</h2>
          <p className="mt-1 text-sm text-ink-muted">Photographers with a complete profile get up to 5× more inquiries.</p>
        </div>
        <div className="hidden md:block text-right">
          <div className="font-display text-3xl font-extrabold text-sun-700">{pct}%</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">complete</div>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-line">
        <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              to={s.to as never}
              className={`group flex items-center gap-3 rounded-2xl border p-3 transition ${
                s.done
                  ? "border-line bg-white/70 opacity-70"
                  : "border-line bg-white hover:border-sun-300 hover:shadow-soft"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-sun-600 text-white" : "bg-sun-50 text-sun-700 ring-1 ring-sun-300/60"}`}>
                {s.done ? <Check className="h-4 w-4" /> : <span className="text-[12px] font-extrabold">{steps.indexOf(s) + 1}</span>}
              </span>
              <span className={`flex-1 text-sm font-semibold ${s.done ? "text-ink-muted line-through" : "text-ink"}`}>{s.label}</span>
              {!s.done && <ArrowRight className="h-4 w-4 text-sun-700 transition group-hover:translate-x-0.5" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
