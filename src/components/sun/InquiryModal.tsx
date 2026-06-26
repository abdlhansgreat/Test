import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SunButton } from "@/components/sun/SunButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Props {
  photographerId: string;
  photographerName: string;
  defaultCity?: string | null;
  open: boolean;
  onClose: () => void;
}

export function InquiryModal({ photographerId, photographerName, defaultCity, open, onClose }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [genres, setGenres] = useState<{ name: string }[]>([]);
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [city, setCity] = useState(defaultCity ?? "");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setCity(defaultCity ?? ""); }, [defaultCity]);

  useEffect(() => {
    if (!open) return;
    supabase.from("genres").select("name").order("name").then(({ data }) => setGenres(data ?? []));
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/login" }); return; }
    setSubmitting(true);
    setError(null);
    const { data, error: insErr } = await supabase
      .from("inquiries")
      .insert({
        customer_id: user.id,
        photographer_id: photographerId,
        event_type: eventType || null,
        event_date: eventDate ? eventDate.toISOString().slice(0, 10) : null,
        city: city || null,
        budget: budget ? Number(budget) : null,
        message: message || null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (insErr || !data) { setError(insErr?.message ?? "Failed to send"); return; }
    // Fire-and-forget engagement layer
    try {
      const { notify, userIdForPhotographer } = await import("@/lib/notify");
      const pUser = await userIdForPhotographer(photographerId);
      const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (pUser) {
        notify({
          event: "new_inquiry",
          recipients: [{ user_id: pUser }],
          data: {
            inquiry_id: data.id,
            customer_name: me?.full_name ?? "A client",
            event_type: eventType,
            city,
            message: message || null,
          },
        });
      }
    } catch { /* ignore */ }
    onClose();
    navigate({ to: "/inquiries/$id", params: { id: data.id } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-warm md:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">Request a quote</h2>
            <p className="text-[13px] text-ink-muted">From {photographerName}. Free, no obligation.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-sun-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Event type">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:border-sun-300 focus:outline-none"
              required
            >
              <option value="">Choose…</option>
              {genres.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
          </Field>

          <Field label="Event date">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-left text-sm hover:border-sun-300",
                    !eventDate && "text-ink-muted",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus className="pointer-events-auto p-3" />
              </PopoverContent>
            </Popover>
          </Field>

          <Field label="City">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Delhi, Mumbai…"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:border-sun-300 focus:outline-none"
              maxLength={120}
            />
          </Field>

          <Field label="Budget (₹)">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 80000"
              min="0"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:border-sun-300 focus:outline-none"
            />
          </Field>

          <Field label="Message">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell them about your event…"
              rows={4}
              maxLength={1000}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:border-sun-300 focus:outline-none"
            />
          </Field>

          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <SunButton type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send inquiry"}
          </SunButton>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
