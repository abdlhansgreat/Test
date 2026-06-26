import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { CustomerLayout } from "@/components/sun/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — PhotoLancer" }] }),
  component: NotificationsPage,
});

interface N { id: string; title: string | null; body: string | null; link: string | null; read: boolean; created_at: string; type: string | null }

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,link,read,created_at,type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      setItems((data ?? []) as N[]);
      setLoading(false);
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    };
    load();
    const channel = supabase
      .channel(`notif_page_${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h1 className="font-display text-3xl font-extrabold text-ink">Notifications</h1>
        <p className="mt-1 text-ink-muted">Everything that's happened on your account.</p>

        <div className="mt-6 rounded-3xl border border-line bg-white p-2 shadow-soft">
          {loading ? (
            <div className="p-8 text-center text-ink-muted">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Inbox className="mx-auto h-8 w-8 text-ink-muted" />
              <p className="mt-3 font-display text-lg font-extrabold text-ink">All clear</p>
              <p className="mt-1 text-sm text-ink-muted">When something happens — a new inquiry, a quote, a message — you'll find it here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((n) => (
                <li key={n.id} className="px-4 py-4">
                  {n.link ? (
                    <Link to={n.link as never} className="block">
                      <Row n={n} />
                    </Link>
                  ) : <Row n={n} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

function Row({ n }: { n: N }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-display text-[15px] font-extrabold text-ink">{n.title}</span>
        {!n.read && <span className="ml-auto h-2 w-2 rounded-full bg-sun-600" aria-hidden />}
      </div>
      {n.body && <div className="mt-0.5 text-sm text-ink-muted">{n.body}</div>}
      <div className="mt-1 text-[11px] text-ink-muted">{new Date(n.created_at).toLocaleString()}</div>
    </div>
  );
}
