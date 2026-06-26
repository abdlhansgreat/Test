// Native Supabase OAuth — replaces the former Lovable auth wrapper.
// Uses Supabase Auth directly so the app no longer depends on Lovable Cloud.
import { supabase } from "@/integrations/supabase/client";

// Matches Supabase Auth provider names (Microsoft = "azure").
type Provider = "google" | "apple" | "azure";

/**
 * Start an OAuth sign-in. On success the browser is redirected to the
 * provider, so code after a successful call does not continue to run.
 * Returns `{ error }` only when sign-in could not be started.
 */
export async function signInWithOAuth(provider: Provider, redirectTo?: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo ?? (typeof window !== "undefined" ? window.location.origin : undefined),
    },
  });
  return { error };
}
