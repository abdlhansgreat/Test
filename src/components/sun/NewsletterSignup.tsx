import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const schema = z.string().trim().email().max(255);

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(email);
    if (!parsed.success) { setStatus("error"); setMessage("Please enter a valid email."); return; }
    setStatus("submitting");
    // Route through edge function so duplicates are silently ignored and
    // unauthenticated callers cannot enumerate existing subscribers.
    const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
      body: { email: parsed.data },
    });
    if (error || !data?.ok) {
      setStatus("error");
      setMessage(data?.message || "Couldn't subscribe right now. Please try again.");
      return;
    }
    setStatus("success");
    setMessage(data.message || "You're on the list. Welcome 🌅");
    setEmail("");
  };

  return (
    <div>
      <h4 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink">Stay in the loop</h4>
      <p className="mt-2 text-[13px] text-ink-muted">Photography stories, curated shoots, and the occasional deal — no spam.</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="email"
            required
            disabled={status === "submitting"}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); setMessage(null); }}
            placeholder="you@example.com"
            className="w-full rounded-full border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink shadow-soft focus:border-sun-300 focus:outline-none"
            maxLength={255}
          />
        </label>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-warm transition hover:opacity-90 disabled:opacity-70"
        >
          {status === "success" ? <><Check className="h-4 w-4" /> Subscribed</> : status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {message && (
        <p className={`mt-2 text-[12px] ${status === "error" ? "text-red-700" : "text-sun-700"}`}>{message}</p>
      )}
    </div>
  );
}
