import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImageIcon, Send, Loader2, ExternalLink, CheckCheck, FileText } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Navbar } from "@/components/sun/Navbar";
import { SunButton } from "@/components/sun/SunButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  head: () => ({ meta: [{ title: "Conversation — PhotoLancer" }] }),
  component: ThreadPage,
});

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachments: string[] | null;
  read: boolean;
  created_at: string;
}

interface OtherProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface InquiryLink {
  id: string;
  status: string;
  photographer_owner_id: string;
  customer_id: string;
}

interface BookingLink {
  id: string;
  status: string;
  photographer_owner_id: string;
  customer_id: string;
}

function ThreadPage() {
  const { conversationId } = Route.useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [other, setOther] = useState<OtherProfile | null>(null);
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);
  const [otherPhotogSlug, setOtherPhotogSlug] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkedInquiry, setLinkedInquiry] = useState<InquiryLink | null>(null);
  const [linkedBooking, setLinkedBooking] = useState<BookingLink | null>(null);
  const [notAllowed, setNotAllowed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversation + other participant + initial messages
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .select("id, participant_a, participant_b")
        .eq("id", conversationId)
        .maybeSingle();
      if (cErr || !conv) { if (!cancelled) { setNotAllowed(true); setLoading(false); } return; }
      const c: any = conv;
      const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("id", otherId)
        .maybeSingle();
      if (!cancelled) {
        setOther((prof as any) ?? { id: otherId, full_name: "Someone", avatar_url: null, role: null });
        if ((prof as any)?.avatar_url) {
          const url = await resolveMediaUrl((prof as any).avatar_url, "avatars");
          if (!cancelled) setOtherAvatar(url);
        }
      }

      // Photographer slug if the other is a photographer
      const { data: photog } = await supabase
        .from("photographers")
        .select("slug, profile_id")
        .eq("profile_id", otherId)
        .maybeSingle();
      if (!cancelled) setOtherPhotogSlug((photog as any)?.slug ?? null);

      // Find a photographer record owned by either user, then look up most recent inquiry/booking between the pair
      const meId = user.id;
      const { data: ownedPhotogs } = await supabase
        .from("photographers")
        .select("id, profile_id")
        .in("profile_id", [meId, otherId]);
      const photogList = (ownedPhotogs ?? []) as Array<{ id: string; profile_id: string }>;

      if (photogList.length > 0) {
        const photogIds = photogList.map((p) => p.id);
        const ownerByPhotog: Record<string, string> = {};
        photogList.forEach((p) => { ownerByPhotog[p.id] = p.profile_id; });

        const { data: inqs } = await supabase
          .from("inquiries")
          .select("id, status, customer_id, photographer_id")
          .in("customer_id", [meId, otherId])
          .in("photographer_id", photogIds)
          .order("created_at", { ascending: false })
          .limit(5);
        const inq: any = (inqs ?? []).find((r: any) => {
          const owner = ownerByPhotog[r.photographer_id];
          return (r.customer_id === meId && owner === otherId) || (r.customer_id === otherId && owner === meId);
        });
        if (!cancelled && inq) {
          setLinkedInquiry({
            id: inq.id,
            status: inq.status,
            photographer_owner_id: ownerByPhotog[inq.photographer_id],
            customer_id: inq.customer_id,
          });
        }

        const { data: bks } = await supabase
          .from("bookings")
          .select("id, status, customer_id, photographer_id")
          .in("customer_id", [meId, otherId])
          .in("photographer_id", photogIds)
          .order("created_at", { ascending: false })
          .limit(5);
        const bk: any = (bks ?? []).find((r: any) => {
          const owner = ownerByPhotog[r.photographer_id];
          return (r.customer_id === meId && owner === otherId) || (r.customer_id === otherId && owner === meId);
        });
        if (!cancelled && bk) {
          setLinkedBooking({
            id: bk.id,
            status: bk.status,
            photographer_owner_id: ownerByPhotog[bk.photographer_id],
            customer_id: bk.customer_id,
          });
        }
      }

      // Initial messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((msgs ?? []) as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [conversationId, user]);

  // Realtime subscription for new/updated messages in this conversation
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages_thread_${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  // Mark incoming messages as read whenever we receive new ones
  useEffect(() => {
    if (!user) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read).map((m) => m.id);
    if (unread.length === 0) return;
    supabase.from("messages").update({ read: true }).in("id", unread).then();
  }, [messages, user]);

  // Resolve attachment URLs
  useEffect(() => {
    const all = messages.flatMap((m) => m.attachments ?? []);
    const missing = all.filter((p) => !(p in attachmentUrls));
    if (missing.length === 0) return;
    (async () => {
      const updates: Record<string, string | null> = {};
      await Promise.all(missing.map(async (p) => {
        updates[p] = await resolveMediaUrl(p, "attachments");
      }));
      setAttachmentUrls((prev) => ({ ...prev, ...updates }));
    })();
  }, [messages, attachmentUrls]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async (overrideAttachment?: string) => {
    if (!user) return;
    const text = body.trim();
    if (!text && !overrideAttachment) return;
    setSending(true);
    const payload: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      body: text || null,
      attachments: overrideAttachment ? [overrideAttachment] : [],
    };
    const { data, error } = await supabase.from("messages").insert(payload).select("*").single();
    setSending(false);
    if (!error && data) {
      setBody("");
      setMessages((prev) => (prev.some((x) => x.id === (data as any).id) ? prev : [...prev, data as Message]));
      try {
        const { data: conv } = await supabase.from("conversations").select("participant_a, participant_b").eq("id", conversationId).maybeSingle();
        if (conv) {
          const otherId = conv.participant_a === user.id ? conv.participant_b : conv.participant_a;
          const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
          const { notify } = await import("@/lib/notify");
          notify({
            event: "new_message",
            recipients: [{ user_id: otherId }],
            data: { conversation_id: conversationId, sender_name: me?.full_name ?? "A member", preview: text || "📷 Photo" },
          });
        }
      } catch { /* ignore */ }
    }
  };

  const onAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${conversationId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return;
    await send(path);
  };

  if (notAllowed) {
    return (
      <Shell>
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <h1 className="font-display text-xl font-extrabold text-ink">Conversation not found</h1>
          <p className="mt-2 text-ink-muted">You may not have access to this conversation.</p>
          <Link to="/messages" className="mt-4 inline-block">
            <SunButton variant="secondary">Back to messages</SunButton>
          </Link>
        </div>
      </Shell>
    );
  }

  const otherInitials = (other?.full_name ?? "?").split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
  const meIsPhotographer = profile?.role === "photographer";

  // Quote / inquiry CTA — only show if the link makes sense
  const quoteCTA = (() => {
    if (linkedInquiry) {
      return {
        label: meIsPhotographer ? "Send a quote" : "View inquiry",
        to: "/inquiries/$id" as const,
        params: { id: linkedInquiry.id },
      };
    }
    return null;
  })();

  return (
    <Shell>
      <div className="flex h-[calc(100vh-160px)] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-5">
          <button onClick={() => navigate({ to: "/messages" })} className="rounded-full p-2 hover:bg-sun-50 md:hidden" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-white">
            {otherAvatar ? <img src={otherAvatar} alt="" className="h-full w-full object-cover" /> : otherInitials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[15px] font-extrabold text-ink">{other?.full_name ?? "Someone"}</div>
            {otherPhotogSlug && (
              <Link to="/p/$slug" params={{ slug: otherPhotogSlug }} className="inline-flex items-center gap-1 text-[12px] font-semibold text-sun-700 hover:underline">
                View profile <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="hidden gap-2 sm:flex">
            {linkedBooking && (
              <Link to="/bookings/$id" params={{ id: linkedBooking.id }}>
                <SunButton variant="secondary" size="sm"><FileText className="h-4 w-4" /> Booking</SunButton>
              </Link>
            )}
            {quoteCTA && (
              <Link to={quoteCTA.to} params={quoteCTA.params}>
                <SunButton variant="primary" size="sm">{quoteCTA.label}</SunButton>
              </Link>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-sun-50/30 px-4 py-5 md:px-6">
          {loading ? (
            <div className="text-center text-ink-muted">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="mx-auto mt-12 max-w-sm text-center text-ink-muted">
              Say hello — share details about your event so {other?.full_name ?? "they"} can respond quickly.
            </div>
          ) : (
            <MessageList
              messages={messages}
              currentUserId={user?.id ?? ""}
              otherInitials={otherInitials}
              otherAvatar={otherAvatar}
              attachmentUrls={attachmentUrls}
            />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-end gap-2 border-t border-line bg-white px-3 py-3 md:px-4"
        >
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onAttach} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink hover:border-sun-300 hover:bg-sun-50"
            aria-label="Attach image"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          </button>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Write a message…"
            rows={1}
            maxLength={2000}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-[14px] focus:border-sun-300 focus:outline-none"
          />
          <SunButton type="submit" disabled={sending || (!body.trim())} size="md" className="!h-11 !px-4">
            <Send className="h-4 w-4" />
          </SunButton>
        </form>
      </div>

      {/* Mobile CTA strip */}
      {(quoteCTA || linkedBooking) && (
        <div className="mt-3 flex gap-2 sm:hidden">
          {linkedBooking && (
            <Link to="/bookings/$id" params={{ id: linkedBooking.id }} className="flex-1">
              <SunButton variant="secondary" size="sm" className="w-full"><FileText className="h-4 w-4" /> Booking</SunButton>
            </Link>
          )}
          {quoteCTA && (
            <Link to={quoteCTA.to} params={quoteCTA.params} className="flex-1">
              <SunButton variant="primary" size="sm" className="w-full">{quoteCTA.label}</SunButton>
            </Link>
          )}
        </div>
      )}
    </Shell>
  );
}

function MessageList({
  messages,
  currentUserId,
  otherInitials,
  otherAvatar,
  attachmentUrls,
}: {
  messages: Message[];
  currentUserId: string;
  otherInitials: string;
  otherAvatar: string | null;
  attachmentUrls: Record<string, string | null>;
}) {
  const groups = useMemo(() => {
    const out: Array<{ date: string; items: Message[] }> = [];
    messages.forEach((m) => {
      const d = new Date(m.created_at);
      const key = format(d, "yyyy-MM-dd");
      const last = out[out.length - 1];
      if (last && last.date === key) last.items.push(m);
      else out.push({ date: key, items: [m] });
    });
    return out;
  }, [messages]);

  const lastReadOwnIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === currentUserId && messages[i].read) return messages[i].id;
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.date}>
          <div className="mb-3 flex justify-center">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted shadow-soft">
              {isSameDay(new Date(g.date), new Date()) ? "Today" : format(new Date(g.date), "EEE, MMM d")}
            </span>
          </div>
          <ul className="space-y-2">
            {g.items.map((m) => {
              const mine = m.sender_id === currentUserId;
              const seen = mine && m.id === lastReadOwnIdx;
              return (
                <li key={m.id} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                  {!mine && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-[10px] font-bold text-white">
                      {otherAvatar ? <img src={otherAvatar} alt="" className="h-full w-full object-cover" /> : otherInitials}
                    </span>
                  )}
                  <div className={cn("max-w-[78%] md:max-w-[60%]")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed shadow-soft",
                        mine
                          ? "bg-gradient-primary text-white rounded-br-md"
                          : "bg-white text-ink rounded-bl-md border border-line",
                      )}
                    >
                      {(m.attachments ?? []).map((path) => (
                        <a
                          key={path}
                          href={attachmentUrls[path] ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="mb-2 block overflow-hidden rounded-xl"
                        >
                          {attachmentUrls[path] ? (
                            <img src={attachmentUrls[path]!} alt="attachment" className="max-h-72 w-full object-cover" />
                          ) : (
                            <div className={cn("flex h-32 items-center justify-center text-xs", mine ? "bg-white/20 text-white/80" : "bg-sun-50 text-ink-muted")}>
                              Loading image…
                            </div>
                          )}
                        </a>
                      ))}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    </div>
                    <div className={cn("mt-1 flex items-center gap-1 text-[10px]", mine ? "justify-end text-ink-muted" : "text-ink-muted")}>
                      <span>{format(new Date(m.created_at), "p")}</span>
                      {seen && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-sun-700">
                          · <CheckCheck className="h-3 w-3" /> Seen
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-4xl px-3 py-4 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
