import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Aperture, Lock, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SunButton } from "@/components/sun/SunButton";

export const Route = createFileRoute("/claim-account")({
  head: () => ({
    meta: [
      { title: "Claim your PhotoLancer profile" },
      { name: "description", content: "Set a password and claim your seeded PhotoLancer profile." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ClaimAccountPage,
});

function ClaimAccountPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"loading" | "set-password" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Supabase places tokens in the URL hash after invite/recovery clicks.
      // The default client auto-detects them; we just need to wait a tick.
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session?.user) {
        setEmail(sess.session.user.email ?? null);
        setPhase("set-password");
        return;
      }
      // Brief retry, hash detection is async.
      let tries = 0;
      const t = setInterval(async () => {
        tries += 1;
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          clearInterval(t);
          setEmail(data.session.user.email ?? null);
          setPhase("set-password");
        } else if (tries > 10) {
          clearInterval(t);
          setError("This claim link is invalid or has expired. Please ask an admin to resend it.");
          setPhase("error");
        }
      }, 250);
      return () => clearInterval(t);
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    try {
      const { error: pErr } = await supabase.auth.updateUser({ password });
      if (pErr) throw pErr;

      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        // Make sure their profile role is photographer (handle_new_user defaults to customer).
        await supabase.from("profiles").update({ role: "photographer" }).eq("id", u.user.id);
      }
      setPhase("done");
      // Land on the warm claim-mode of onboarding.
      setTimeout(() => navigate({ to: "/onboarding", search: { claim: 1 } as never }), 800);
    } catch (err) {
      setError((err as Error).message ?? "Could not set password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12 md:px-0">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-soft">
            <Aperture className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-tight text-ink">PhotoLancer</span>
        </div>

        <div className="rounded-3xl border border-line bg-white p-8 shadow-soft">
          <span className="inline-flex items-center gap-2 rounded-full bg-sun-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-sun-700">
            <Sparkles className="h-3.5 w-3.5" /> Claim your profile
          </span>

          {phase === "loading" && (
            <p className="mt-5 text-ink-muted">Verifying your claim link…</p>
          )}

          {phase === "error" && (
            <>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">Link not valid</h1>
              <p className="mt-2 text-[15px] text-ink-muted">{error}</p>
            </>
          )}

          {phase === "set-password" && (
            <>
              <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">Set a password</h1>
              <p className="mt-1 text-[15px] text-ink-muted">
                Welcome to PhotoLancer{email ? `, ${email}` : ""}. Set a password and your profile is yours.
              </p>
              <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
                <label className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="password" autoComplete="new-password" required minLength={8}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min 8 characters)"
                    className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-[15px] outline-none focus:border-sun-300"
                  />
                </label>
                <label className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <input
                    type="password" autoComplete="new-password" required minLength={8}
                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-[15px] outline-none focus:border-sun-300"
                  />
                </label>
                {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{error}</div>}
                <SunButton type="submit" disabled={saving} size="lg">
                  {saving ? "Saving…" : <>Claim my profile <ArrowRight className="h-4 w-4" /></>}
                </SunButton>
              </form>
            </>
          )}

          {phase === "done" && (
            <>
              <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">You're in! 🎉</h1>
              <p className="mt-2 text-[15px] text-ink-muted">Taking you to finish your profile…</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
