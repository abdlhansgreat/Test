import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Navbar } from "@/components/sun/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { resolveMediaUrl } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — PhotoLancer" }] }),
  component: MessagesIndexPage,
});

interface Row {
  id: string;
  other_id: string;
  other_name: string;
  other_avatar_url: string | null;
  last_message_at: string;
  snippet: string;
  unread: number;
}

function MessagesIndexPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, participant_a, participant_b, last_message_at")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });
      const list = (convs ?? []) as Array<{ id: string; participant_a: string; participant_b: string; last_message_at: string }>;
      if (list.length === 0) { setRows([]); setLoading(false); return; }

      const otherIds = Array.from(new Set(list.map((c) => (c.participant_a === user.id ? c.participant_b : c.participant_a))));
      const convIds = list.map((c) => c.id);

      const [{ data: profs }, { data: msgs }, { data: unreadAgg }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherIds) as any,
        supabase
          .from("messages")
          .select("conversation_id, body, attachments, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .eq("read", false),
      ]);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const lastByConv = new Map<string, { body: string | null; attachments: string[] | null; created_at: string }>();
      (msgs ?? []).forEach((m: any) => {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      });
      const unreadByConv = new Map<string, number>();
      (unreadAgg ?? []).forEach((m: any) => {
        unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
      });

      const avatarMap: Record<string, string | null> = {};
      await Promise.all(
        otherIds.map(async (id) => {
          const p: any = profMap.get(id);
          avatarMap[id] = p?.avatar_url ? await resolveMediaUrl(p.avatar_url, "avatars") : null;
        }),
      );

      const result: Row[] = list.map((c) => {
        const oid = c.participant_a === user.id ? c.participant_b : c.participant_a;
        const p: any = profMap.get(oid);
        const last = lastByConv.get(c.id);
        const snippet = last
          ? (last.body && last.body.trim().length > 0 ? last.body : (last.attachments && last.attachments.length > 0 ? "📷 Photo" : ""))
          : "No messages yet";
        return {
          id: c.id,
          other_id: oid,
          other_name: p?.full_name ?? "Someone",
          other_avatar_url: avatarMap[oid] ?? null,
          last_message_at: c.last_message_at,
          snippet,
          unread: unreadByConv.get(c.id) ?? 0,
        };
      });
      setRows(result);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`messages_list_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl font-extrabold text-ink">Messages</h1>
        <p className="mt-1 text-ink-muted">Conversations with photographers and clients.</p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          {loading ? (
            <div className="p-8 text-center text-ink-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-50 text-sun-700">
                <MessageCircle className="h-7 w-7" />
              </div>
              <p className="font-display text-lg font-extrabold text-ink">No messages yet</p>
              <p className="max-w-sm text-[14px] text-ink-muted">
                Reach out to a photographer to start a conversation.
              </p>
              <Link to="/search" className="mt-2 text-sm font-bold text-sun-700 hover:underline">
                Browse photographers →
              </Link>
            </div>
          ) : (
            <ul>
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    to="/messages/$conversationId"
                    params={{ conversationId: r.id }}
                    className="flex items-center gap-4 border-b border-line/60 px-5 py-4 last:border-b-0 transition hover:bg-sun-50/40"
                  >
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-white">
                      {r.other_avatar_url ? (
                        <img src={r.other_avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        r.other_name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?"
                      )}
                      {r.unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sun-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                          {r.unread > 9 ? "9+" : r.unread}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={`truncate font-display text-[15px] font-extrabold ${r.unread > 0 ? "text-ink" : "text-ink"}`}>{r.other_name}</span>
                        <span className="shrink-0 text-[11px] text-ink-muted">
                          {formatDistanceToNow(new Date(r.last_message_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`mt-0.5 truncate text-[13px] ${r.unread > 0 ? "font-semibold text-ink" : "text-ink-muted"}`}>
                        {r.snippet}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
