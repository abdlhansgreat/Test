import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface Notification {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const closeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setItems([]); setUnread(0); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,body,link,read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const list = (data ?? []) as Notification[];
      setItems(list);
      setUnread(list.filter((n) => !n.read).length);
    };
    load();
    const channel = supabase
      .channel(`notif_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  const onOpen = async () => {
    setOpen((o) => !o);
    if (!open && unread > 0 && user) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={closeRef}>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft transition hover:border-sun-300 hover:bg-sun-50"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sun-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-warm">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-display text-sm font-extrabold text-ink">Notifications</span>
              <Link to="/notifications" onClick={() => setOpen(false)} className="text-[12px] font-bold text-sun-700 hover:text-sun-800">View all</Link>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="mx-auto h-7 w-7 text-ink-muted" />
                <p className="mt-2 text-sm text-ink-muted">You're all caught up.</p>
              </div>
            ) : (
              <ul className="max-h-96 divide-y divide-line overflow-auto">
                {items.slice(0, 10).map((n) => (
                  <li key={n.id}>
                    {n.link ? (
                      <Link to={n.link as never} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-sun-50">
                        <NotifBody n={n} />
                      </Link>
                    ) : (
                      <div className="px-4 py-3"><NotifBody n={n} /></div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotifBody({ n }: { n: Notification }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-display text-[14px] font-extrabold text-ink">{n.title ?? "Notification"}</span>
        {!n.read && <span className="ml-auto h-2 w-2 rounded-full bg-sun-600" aria-hidden />}
      </div>
      {n.body && <div className="mt-0.5 text-[13px] text-ink-muted line-clamp-2">{n.body}</div>}
      <div className="mt-1 text-[11px] text-ink-muted">{new Date(n.created_at).toLocaleString()}</div>
    </>
  );
}
