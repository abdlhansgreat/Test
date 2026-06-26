import { useEffect, useState } from "react";
import { Aperture, Menu, LogOut, LayoutDashboard, Camera, MessageCircle, Sparkles } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { SunButton } from "./SunButton";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "./NotificationsBell";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [myConvIds, setMyConvIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!profile?.avatar_url) { setSignedAvatar(null); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(profile.avatar_url, 3600);
      setSignedAvatar(data?.signedUrl ?? null);
    })();
  }, [profile?.avatar_url]);

  // Load conversation ids + unread count
  useEffect(() => {
    if (!user) { setUnread(0); setMyConvIds([]); return; }
    let cancelled = false;
    let convIds: string[] = [];
    const refresh = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);
      const ids = (convs ?? []).map((c: { id: string }) => c.id);
      if (cancelled) return;
      convIds = ids;
      setMyConvIds(ids);
      if (ids.length === 0) { setUnread(0); return; }
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids)
        .neq("sender_id", user.id)
        .eq("read", false);
      if (!cancelled) setUnread(count ?? 0);
    };
    refresh();

    // Realtime: any change to messages where user is a participant
    const channel = supabase
      .channel(`navbar_unread_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        refresh();
        if (payload.eventType !== "INSERT") return;
        const nm: any = payload.new;
        if (!nm || nm.sender_id === user.id) return;
        if (!convIds.includes(nm.conversation_id)) return;
        if (pathname === `/messages/${nm.conversation_id}`) return;
        toast("New message", {
          description: nm.body?.slice(0, 80) || "📷 Photo",
          action: {
            label: "Open",
            onClick: () => navigate({ to: "/messages/$conversationId", params: { conversationId: nm.conversation_id } }),
          },
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => refresh())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initials = (profile?.full_name ?? user?.email ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

  const onSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate({ to: "/" });
  };

  const homeHref = profile?.role === "photographer" ? "/studio" : "/dashboard";

  return (
    <header className="relative z-20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8 md:py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-soft">
            <Aperture className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-tight text-ink">
            PhotoLancer
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-[15px] font-medium text-ink/80 md:flex">
          <Link to="/search" className="hover:text-ink">Find photographers</Link>
          <Link to="/inspiration" className="hover:text-ink">Inspiration</Link>
          <Link to="/gigs" className="hover:text-ink">Find gigs</Link>
          <Link to="/blog" className="hover:text-ink">Guides</Link>
          <Link to="/for-photographers" className="hover:text-ink">For photographers</Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <NotificationsBell />
              <Link
                to="/messages"
                aria-label="Messages"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft transition hover:border-sun-300 hover:bg-sun-50"
              >
                <MessageCircle className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sun-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 shadow-soft transition hover:border-sun-300"
                >
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-[12px] font-bold text-white">
                    {signedAvatar ? (
                      <img src={signedAvatar} alt="" className="h-full w-full object-cover" />
                    ) : initials}
                  </span>
                  <span className="max-w-[120px] truncate text-[13px] font-bold text-ink">
                    {profile?.full_name ?? user.email}
                  </span>
                </button>
                {open && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white shadow-warm">
                      <Link
                        to={homeHref}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-[14px] font-semibold text-ink hover:bg-sun-50"
                      >
                        {profile?.role === "photographer" ? <Camera className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
                        {profile?.role === "photographer" ? "My studio" : "Dashboard"}
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-[14px] font-semibold text-ink hover:bg-sun-50"
                      >
                        <MessageCircle className="h-4 w-4" /> Messages
                        {unread > 0 && (
                          <span className="ml-auto rounded-full bg-sun-600 px-2 py-0.5 text-[10px] font-extrabold text-white">{unread}</span>
                        )}
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          to={"/admin" as never}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-[14px] font-semibold text-sun-700 hover:bg-sun-50"
                        >
                          <Sparkles className="h-4 w-4" /> Admin
                        </Link>
                      )}
                      <button
                        onClick={onSignOut}
                        className="flex w-full items-center gap-2.5 border-t border-line px-4 py-3 text-left text-[14px] font-semibold text-ink hover:bg-sun-50"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login"><SunButton variant="ghost" size="sm">Log in</SunButton></Link>
              <Link to="/signup"><SunButton variant="primary" size="sm">Join as a photographer</SunButton></Link>
            </>
          )}
        </div>

        <button className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white/70 backdrop-blur" aria-label="Open menu">
          <Menu className="h-5 w-5 text-ink" />
        </button>
      </nav>
    </header>
  );
}
