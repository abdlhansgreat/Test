import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Aperture, ArrowRight, ArrowLeft, Camera, Heart, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithOAuth } from "@/integrations/auth/oauth";
import { SunButton } from "@/components/sun/SunButton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Join PhotoLancer" },
      { name: "description", content: "Create your PhotoLancer account — as a client or a photographer." },
    ],
  }),
  component: SignupPage,
});

type Role = "customer" | "photographer";

function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { role, full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      setError("Check your email to confirm your account, then sign in.");
      return;
    }
    if (data.user) {
      const { notify } = await import("@/lib/notify");
      notify({ event: "welcome", recipients: [{ user_id: data.user.id, email, name: fullName }] });
    }
    navigate({ to: role === "photographer" ? "/onboarding" : "/dashboard" });
  };

  const onGoogle = async () => {
    if (!role) return;
    sessionStorage.setItem("pl_intended_role", role);
    const { error } = await signInWithOAuth("google", window.location.origin);
    if (error) setError(error.message ?? "Google sign-in failed");
  };

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-soft">
            <Aperture className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-tight text-ink">PhotoLancer</span>
        </Link>

        {!role ? (
          <div className="rounded-3xl border border-line bg-white p-8 shadow-soft">
            <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">How will you use PhotoLancer?</h1>
            <p className="mt-2 text-[15px] text-ink-muted">Pick one to get started — you can change later.</p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <RoleCard
                title="I'm looking to hire a photographer"
                desc="Browse, message, and book verified photographers for weddings, fashion, products and more."
                icon={<Heart className="h-6 w-6" />}
                onClick={() => setRole("customer")}
                tone="rose"
              />
              <RoleCard
                title="I'm a photographer or studio"
                desc="Get discovered, get booked, earn from second-shoots. No lead fees, ever."
                icon={<Camera className="h-6 w-6" />}
                onClick={() => setRole("photographer")}
                tone="sun"
              />
            </div>

            <p className="mt-6 text-center text-[14px] text-ink-muted">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-sun-700 hover:text-sun-800">Log in</Link>
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-white p-8 shadow-soft">
            <button
              onClick={() => setRole(null)}
              className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change
            </button>
            <h1 className="font-display text-3xl font-extrabold text-ink">
              {role === "photographer" ? "Create your photographer account" : "Create your account"}
            </h1>
            <p className="mt-1 text-[15px] text-ink-muted">It only takes a minute.</p>

            <button
              onClick={onGoogle}
              type="button"
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-semibold text-ink shadow-soft transition hover:border-sun-300 hover:bg-sun-50"
            >
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
              <div className="h-px flex-1 bg-line" /> or <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-sun-300"
              />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-sun-300"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-sun-300"
              />

              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{error}</div>
              )}

              <SunButton type="submit" disabled={loading} size="lg">
                {loading ? "Creating account…" : <>Create account <ArrowRight className="h-4 w-4" /></>}
              </SunButton>
            </form>

            <p className="mt-6 text-center text-[14px] text-ink-muted">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-sun-700 hover:text-sun-800">Log in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RoleCard({
  title, desc, icon, onClick, tone,
}: {
  title: string; desc: string; icon: React.ReactNode; onClick: () => void; tone: "sun" | "rose";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border-2 border-line bg-white p-6 text-left shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-sun-300 hover:shadow-warm",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-soft",
          tone === "sun" ? "bg-gradient-primary" : "tile-rose",
        )}
      >
        {icon}
      </span>
      <h3 className="font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="text-[14px] leading-relaxed text-ink-muted">{desc}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-sun-700 group-hover:text-sun-800">
        Continue <ArrowRight className="h-3.5 w-3.5" />
      </span>
      <Check className="absolute right-4 top-4 h-5 w-5 text-sun-300 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}
