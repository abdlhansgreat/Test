import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Check, MessageCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Navbar } from "@/components/sun/Navbar";
import { Footer } from "@/components/sun/Footer";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";

const URL = "https://photolancer.lovable.app/contact";
const SUPPORT_EMAIL = "hello@photolancers.in";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact PhotoLancer — We're here to help" },
      { name: "description", content: "Get in touch with the PhotoLancer team. We answer support questions, partnership inquiries and press requests." },
      { property: "og:title", content: "Contact PhotoLancer" },
      { property: "og:description", content: "Reach the PhotoLancer team for support, partnerships or press." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().min(1, "Add a subject").max(200),
  message: z.string().trim().min(5, "Tell us a little more").max(2000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't send — please try again.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-dvh bg-surface">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pb-20 pt-6 md:px-8">
        <header className="text-center">
          <h1 className="font-display text-4xl font-extrabold text-ink md:text-5xl">Get in touch</h1>
          <p className="mx-auto mt-3 max-w-xl text-[16px] text-ink-muted">We usually reply within one business day. Quickest answers often live in our FAQ.</p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <section className="rounded-3xl border border-line bg-white p-6 shadow-soft md:p-8">
            {done ? (
              <div className="py-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-white shadow-warm"><Check className="h-7 w-7" /></span>
                <h2 className="mt-5 font-display text-2xl font-extrabold text-ink">Message sent — thank you!</h2>
                <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-muted">Our team will get back to you at <strong>{form.email}</strong>. In the meantime, our FAQ might help.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link to="/faq"><SunButton variant="ghost">Browse FAQ</SunButton></Link>
                  <Link to="/"><SunButton variant="primary">Back home</SunButton></Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Your name">
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={input} placeholder="Jane Doe" maxLength={120} required />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={input} placeholder="you@example.com" maxLength={255} required />
                  </Field>
                </div>
                <Field label="Subject">
                  <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className={input} placeholder="How can we help?" maxLength={200} required />
                </Field>
                <Field label="Message">
                  <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={`${input} min-h-[160px]`} placeholder="Share a bit of context…" maxLength={2000} required />
                </Field>
                <SunButton type="submit" variant="primary" disabled={submitting}>{submitting ? "Sending…" : "Send message"}</SunButton>
              </form>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-50 text-sun-700"><Mail className="h-5 w-5" /></span>
              <h3 className="mt-3 font-display text-lg font-extrabold text-ink">Support email</h3>
              <p className="mt-1 text-[14.5px] text-ink-muted">Prefer email? Reach us at</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-1 inline-block text-sm font-bold text-sun-700 hover:underline">{SUPPORT_EMAIL}</a>
            </div>
            <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-50 text-sun-700"><MessageCircle className="h-5 w-5" /></span>
              <h3 className="mt-3 font-display text-lg font-extrabold text-ink">Quick answers</h3>
              <p className="mt-1 text-[14.5px] text-ink-muted">Most questions are already answered here.</p>
              <Link to="/faq" className="mt-3 inline-block"><SunButton variant="ghost" size="sm">Read the FAQ</SunButton></Link>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const input = "w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-[15px] text-ink shadow-soft outline-none transition placeholder:text-ink-muted focus:border-sun-300 focus:ring-2 focus:ring-sun-200";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wider text-sun-700">{label}</span>
      {children}
    </label>
  );
}
