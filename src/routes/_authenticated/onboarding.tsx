import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, X, Upload, Instagram, Link as LinkIcon, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SunButton } from "@/components/sun/SunButton";
import { Navbar } from "@/components/sun/Navbar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: z.object({ claim: z.coerce.number().optional() }),
  head: () => ({
    meta: [
      { title: "Set up your photographer profile — PhotoLancer" },
      { name: "description", content: "Tell us about your work so the right clients can find you." },
    ],
  }),
  component: OnboardingPage,
});

type Kind = "freelancer" | "studio" | "both";
interface Genre { id: string; name: string; slug: string; }

interface FormState {
  business_name: string;
  kind: Kind;
  base_city: string;
  service_cities: string[];
  languages: string[];
  genres: string[]; // genre ids
  years_experience: string;
  team_size: string;
  equipment: string[];
  starting_price: string;
  day_rate: string;
  available_for_second_shoots: boolean;
  phone: string;
  avatar_url: string | null;
}

const STEPS = ["Basics", "Work", "Pricing", "Portfolio", "Profile"] as const;

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "studio";
}

function OnboardingPage() {
  const navigate = useNavigate();
  const { claim } = Route.useSearch();
  const isClaimMode = claim === 1;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [photographerId, setPhotographerId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    business_name: "",
    kind: "freelancer",
    base_city: "",
    service_cities: [],
    languages: [],
    genres: [],
    years_experience: "",
    team_size: "",
    equipment: [],
    starting_price: "",
    day_rate: "",
    available_for_second_shoots: false,
    phone: "",
    avatar_url: null,
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
        return;
      }
      setUserId(u.user.id);

      // If already onboarded, redirect to studio
      const { data: photog } = await supabase
        .from("photographers")
        .select("id, business_name, kind, base_city, service_cities, languages, years_experience, team_size, equipment, starting_price, day_rate, available_for_second_shoots")
        .eq("profile_id", u.user.id)
        .maybeSingle();

      if (photog) {
        setPhotographerId(photog.id);
        // Pre-fill so they can edit
        setForm((f) => ({
          ...f,
          business_name: photog.business_name ?? "",
          kind: (photog.kind as Kind) ?? "freelancer",
          base_city: photog.base_city ?? "",
          service_cities: photog.service_cities ?? [],
          languages: photog.languages ?? [],
          years_experience: photog.years_experience?.toString() ?? "",
          team_size: photog.team_size?.toString() ?? "",
          equipment: photog.equipment ?? [],
          starting_price: photog.starting_price?.toString() ?? "",
          day_rate: photog.day_rate?.toString() ?? "",
          available_for_second_shoots: photog.available_for_second_shoots ?? false,
        }));
        // Load genres
        const { data: pg } = await supabase
          .from("photographer_genres")
          .select("genre_id")
          .eq("photographer_id", photog.id);
        if (pg) setForm((f) => ({ ...f, genres: pg.map((r) => r.genre_id) }));
      }

      // Load profile for phone/avatar
      const { data: profile } = await supabase.rpc("get_my_profile").single();
      if (profile) {
        const p = profile as { phone?: string | null; avatar_url?: string | null };
        setForm((f) => ({
          ...f,
          phone: p.phone ?? f.phone,
          avatar_url: p.avatar_url ?? f.avatar_url,
        }));
      }

      const { data: g } = await supabase.from("genres").select("id, name, slug").order("name");
      if (g) setGenres(g);

      setLoading(false);
    })();
  }, [navigate]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const stepValid = useMemo(() => {
    if (step === 0) return form.business_name.trim().length > 1 && form.base_city.trim().length > 1;
    if (step === 1) return form.genres.length > 0;
    if (step === 2) return form.starting_price.trim().length > 0 && !isNaN(Number(form.starting_price));
    return true;
  }, [step, form]);

  const onNext = () => {
    if (!stepValid) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const onFinish = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      // Build unique slug
      let baseSlug = slugify(form.business_name);
      let slug = baseSlug;
      let attempt = 0;
      while (true) {
        const { data: existing } = await supabase
          .from("photographers")
          .select("id, profile_id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing || existing.profile_id === userId) break;
        attempt += 1;
        slug = `${baseSlug}-${attempt + 1}`;
        if (attempt > 50) { slug = `${baseSlug}-${Date.now()}`; break; }
      }

      const payload = {
        profile_id: userId,
        slug,
        business_name: form.business_name.trim(),
        kind: form.kind,
        base_city: form.base_city.trim(),
        service_cities: form.service_cities,
        languages: form.languages,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        team_size: form.team_size ? Number(form.team_size) : null,
        equipment: form.equipment,
        starting_price: form.starting_price ? Number(form.starting_price) : null,
        day_rate: form.day_rate ? Number(form.day_rate) : null,
        available_for_second_shoots: form.available_for_second_shoots,
      };

      let photogId = photographerId;
      if (photogId) {
        const { error: upErr } = await supabase
          .from("photographers")
          .update(payload)
          .eq("id", photogId);
        if (upErr) throw upErr;
      } else {
        const { data: ins, error: insErr } = await supabase
          .from("photographers")
          .insert(payload)
          .select("id")
          .single();
        if (insErr) throw insErr;
        photogId = ins.id;
      }

      // Sync genres
      await supabase.from("photographer_genres").delete().eq("photographer_id", photogId!);
      if (form.genres.length > 0) {
        const rows = form.genres.map((gid) => ({ photographer_id: photogId!, genre_id: gid }));
        const { error: gErr } = await supabase.from("photographer_genres").insert(rows);
        if (gErr) throw gErr;
      }

      // Profile phone + avatar
      const profileUpdate: { phone?: string; avatar_url?: string } = {};
      if (form.phone) profileUpdate.phone = form.phone;
      if (form.avatar_url) profileUpdate.avatar_url = form.avatar_url;
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate).eq("id", userId);
      }

      // Claim mode → mark profile claimed and publish it.
      if (isClaimMode && photogId) {
        await supabase.from("photographers").update({
          claimed: true,
          claimed_at: new Date().toISOString(),
          invite_status: "claimed",
          is_published: true,
        }).eq("id", photogId);
      }

      navigate({ to: "/studio", search: { celebrate: isClaimMode ? 1 : undefined } as never });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="mx-auto max-w-3xl px-5 py-20 text-center text-ink-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-16">
        {isClaimMode && (
          <div className="mb-6 rounded-3xl border border-sun-300/60 bg-gradient-to-br from-sun-50 to-white p-5 shadow-soft">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700 ring-1 ring-sun-300/60">
              <Sparkles className="h-3.5 w-3.5" /> Welcome to PhotoLancer
            </span>
            <h1 className="mt-3 font-display text-2xl font-extrabold text-ink md:text-3xl">
              Let's finish your profile, {form.business_name || "there"} 👋
            </h1>
            <p className="mt-1 text-[15px] text-ink-muted">
              We've set up your India Photographers Club profile — just confirm the details, add a few photos, and you're live.
            </p>
          </div>
        )}
        <ProgressBar step={step} total={STEPS.length} labels={[...STEPS]} />

        <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft md:p-10">
          {step === 0 && (
            <StepBasics form={form} update={update} />
          )}
          {step === 1 && (
            <StepWork form={form} update={update} genres={genres} />
          )}
          {step === 2 && (
            <StepPricing form={form} update={update} />
          )}
          {step === 3 && (
            <StepPortfolio />
          )}
          {step === 4 && (
            <StepProfile form={form} update={update} userId={userId} />
          )}

          {error && (
            <div className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{error}</div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <SunButton
              variant="ghost"
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </SunButton>
            {step < STEPS.length - 1 ? (
              <SunButton onClick={onNext} disabled={!stepValid}>
                Continue <ArrowRight className="h-4 w-4" />
              </SunButton>
            ) : (
              <SunButton onClick={onFinish} disabled={saving}>
                {saving ? "Saving…" : <>Finish <Check className="h-4 w-4" /></>}
              </SunButton>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProgressBar({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-ink-muted">
        <span>Step {step + 1} of {total}</span>
        <span className="text-sun-700">{labels[step]}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sun-50">
        <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-sun-300";

function ChipInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) { setDraft(""); return; }
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="rounded-xl border border-line bg-white p-2.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2.5 py-1 text-[12px] font-semibold text-ink">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-ink-muted hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex flex-1 items-center gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="min-w-[120px] flex-1 bg-transparent px-2 py-1 text-[14px] outline-none"
          />
          <button type="button" onClick={add} className="rounded-lg p-1.5 text-ink-muted hover:bg-sun-50 hover:text-sun-700">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StepBasics({ form, update }: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">The basics</h2>
        <p className="mt-1 text-[14px] text-ink-muted">Tell us about you or your studio.</p>
      </div>

      <Field label="Business or studio name">
        <input className={inputCls} value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="e.g. Aperture & Co." />
      </Field>

      <Field label="You are a">
        <div className="grid grid-cols-3 gap-2">
          {(["freelancer", "studio", "both"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => update("kind", k)}
              className={cn(
                "rounded-xl border px-3 py-3 text-[13px] font-bold capitalize transition",
                form.kind === k
                  ? "border-sun-600 bg-sun-50 text-sun-800"
                  : "border-line bg-white text-ink hover:border-sun-300",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Base city">
        <input className={inputCls} value={form.base_city} onChange={(e) => update("base_city", e.target.value)} placeholder="e.g. Mumbai" />
      </Field>

      <Field label="Cities you serve" hint="Press Enter to add.">
        <ChipInput values={form.service_cities} onChange={(v) => update("service_cities", v)} placeholder="Add a city" />
      </Field>

      <Field label="Languages you speak" hint="Press Enter to add.">
        <ChipInput values={form.languages} onChange={(v) => update("languages", v)} placeholder="e.g. English" />
      </Field>
    </div>
  );
}

function StepWork({
  form, update, genres,
}: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void; genres: Genre[] }) {
  const toggle = (id: string) => {
    update("genres", form.genres.includes(id) ? form.genres.filter((x) => x !== id) : [...form.genres, id]);
  };
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Your work</h2>
        <p className="mt-1 text-[14px] text-ink-muted">Help clients find the right fit.</p>
      </div>

      <Field label="What do you shoot?" hint="Select all that apply.">
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => {
            const active = form.genres.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggle(g.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                  active
                    ? "border-transparent bg-gradient-primary text-white shadow-soft"
                    : "border-line bg-white text-ink hover:border-sun-300 hover:bg-sun-50",
                )}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Years of experience">
          <input type="number" min={0} className={inputCls} value={form.years_experience} onChange={(e) => update("years_experience", e.target.value)} placeholder="5" />
        </Field>
        <Field label="Team size">
          <input type="number" min={1} className={inputCls} value={form.team_size} onChange={(e) => update("team_size", e.target.value)} placeholder="1" />
        </Field>
      </div>

      <Field label="Equipment" hint="Cameras, lenses, lights, drones — press Enter to add.">
        <ChipInput values={form.equipment} onChange={(v) => update("equipment", v)} placeholder="e.g. Sony A7 IV" />
      </Field>
    </div>
  );
}

function StepPricing({
  form, update,
}: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Pricing</h2>
        <p className="mt-1 text-[14px] text-ink-muted">You can change this anytime.</p>
      </div>

      <Field label="Starting price (₹)" hint="The minimum a client can book you for.">
        <input type="number" min={0} className={inputCls} value={form.starting_price} onChange={(e) => update("starting_price", e.target.value)} placeholder="35000" />
      </Field>

      <Field label="Day rate (₹) — optional">
        <input type="number" min={0} className={inputCls} value={form.day_rate} onChange={(e) => update("day_rate", e.target.value)} placeholder="50000" />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-sun-50/40 p-4 transition hover:border-sun-300">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-sun-600"
          checked={form.available_for_second_shoots}
          onChange={(e) => update("available_for_second_shoots", e.target.checked)}
        />
        <span>
          <span className="block font-display text-[15px] font-bold text-ink">Available for paid second-shoots</span>
          <span className="mt-0.5 block text-[13px] text-ink-muted">Other photographers can book you to assist on shoots.</span>
        </span>
      </label>
    </div>
  );
}

function StepPortfolio() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Show your work</h2>
        <p className="mt-1 text-[14px] text-ink-muted">You can skip this and add it later from your studio.</p>
      </div>

      <div className="grid gap-3">
        <PortfolioButton icon={<Instagram className="h-5 w-5" />} label="Connect Instagram" hint="We'll pull your best frames automatically." />
        <PortfolioButton icon={<LinkIcon className="h-5 w-5" />} label="Add portfolio links" hint="Your website, Behance, Pixieset…" />
        <PortfolioButton icon={<Upload className="h-5 w-5" />} label="Upload highlights" hint="Up to 12 hero images." />
      </div>

      <p className="text-[13px] text-ink-muted">
        Coming soon — finish onboarding now and we'll prompt you again from your studio.
      </p>
    </div>
  );
}

function PortfolioButton({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <button
      type="button"
      disabled
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left opacity-70"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sun-50 text-sun-700">{icon}</span>
      <span className="flex-1">
        <span className="block font-display text-[15px] font-bold text-ink">{label}</span>
        <span className="block text-[13px] text-ink-muted">{hint}</span>
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Soon</span>
    </button>
  );
}

function StepProfile({
  form, update, userId,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  userId: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!form.avatar_url) { setSignedUrl(null); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(form.avatar_url, 3600);
      setSignedUrl(data?.signedUrl ?? null);
    })();
  }, [form.avatar_url]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setErr(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      update("avatar_url", path);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Your profile</h2>
        <p className="mt-1 text-[14px] text-ink-muted">A photo and number make you ~3x more likely to get booked.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-line bg-sun-50">
          {signedUrl ? (
            <img src={signedUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">📷</div>
          )}
        </div>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="sr-only" onChange={onUpload} />
          <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] font-bold text-ink hover:border-sun-300 hover:bg-sun-50">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : signedUrl ? "Change photo" : "Upload photo"}
          </span>
        </label>
      </div>
      {err && <div className="text-[13px] text-destructive">{err}</div>}

      <Field label="Phone number" hint="Used for booking confirmations. Never shared publicly.">
        <input
          type="tel"
          className={inputCls}
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="+91 98765 43210"
        />
      </Field>
    </div>
  );
}
