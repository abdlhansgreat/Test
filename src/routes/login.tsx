import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Aperture, Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithOAuth } from "@/integrations/auth/oauth";
import { SunButton } from "@/components/sun/SunButton";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Log in — PhotoLancer" },
      { name: "description", content: "Sign in to your PhotoLancer account." },
    ],
  }),
  component: LoginPage,
});

async function routeAfterLogin(navigate: ReturnType<typeof useNavigate>, fallback?: string) {
  if (fallback && fallback.startsWith("/") && !fallback.startsWith("//")) {
    window.location.href = fallback;
    return;
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    navigate({ to: "/" });
    return;
  }
  const { data: profile } = await supabase.rpc("get_my_profile").single();
  const role = (profile as { role?: string } | null)?.role;
  if (role === "photographer") {
    // Check if onboarding done
    const { data: photog } = await supabase
      .from("photographers")
      .select("id")
      .eq("profile_id", userData.user.id)
      .maybeSingle();
    navigate({ to: photog ? "/studio" : "/onboarding" });
  } else {
    navigate({ to: "/dashboard" });
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    await routeAfterLogin(navigate, search.redirect);
  };

  const onGoogleLogin = async () => {
    setError(null);
    const { error } = await signInWithOAuth("google", window.location.origin);
    if (error) {
      setError(error.message ?? "Google sign-in failed");
      return;
    }
    // On success the browser redirects to Google; Supabase returns the
    // session on redirect back and routing resumes from there.
  };

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12 md:px-0">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-soft">
            <Aperture className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-tight text-ink">PhotoLancer</span>
        </Link>

        <div className="rounded-3xl border border-line bg-white p-8 shadow-soft">
          <h1 className="font-display text-3xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-1 text-[15px] text-ink-muted">Sign in to continue.</p>

          <button
            onClick={onGoogleLogin}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-semibold text-ink shadow-soft transition hover:border-sun-300 hover:bg-sun-50"
            type="button"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-wider text-ink-muted">
            <div className="h-px flex-1 bg-line" /> or <div className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onEmailLogin} className="flex flex-col gap-3">
            <label className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-[15px] text-ink outline-none focus:border-sun-300"
              />
            </label>
            <label className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-[15px] text-ink outline-none focus:border-sun-300"
              />
            </label>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{error}</div>
            )}

            <SunButton type="submit" disabled={loading} size="lg">
              {loading ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </SunButton>
          </form>

          <p className="mt-6 text-center text-[14px] text-ink-muted">
            New to PhotoLancer?{" "}
            <Link to="/signup" className="font-bold text-sun-700 hover:text-sun-800">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
