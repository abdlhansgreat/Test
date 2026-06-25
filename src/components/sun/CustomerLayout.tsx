import { ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare, Calendar, Heart, Inbox, Menu, X } from "lucide-react";
import { Navbar } from "./Navbar";

const items = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/inquiries", label: "Inquiries", icon: Inbox },
  { to: "/bookings", label: "Bookings", icon: Calendar },
  { to: "/saved", label: "Saved", icon: Heart },
  { to: "/messages", label: "Messages", icon: MessageSquare },
] as const;

export function CustomerLayout({ children, title }: { children: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const Nav = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const Icon = it.icon;
        const active = isActive(it.to, (it as { exact?: boolean }).exact);
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onClick}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-gradient-primary text-white shadow-warm"
                : "text-ink-muted hover:bg-sun-50 hover:text-sun-700"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <span className="font-display text-lg font-extrabold text-ink">{title ?? "Account"}</span>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow-soft"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" /> Menu
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <div className="sticky top-24 rounded-3xl border border-line bg-white p-3 shadow-soft">
              <div className="px-3 pb-3 pt-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-sun-700">Account</div>
              </div>
              <Nav />
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto bg-white p-5 shadow-warm">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-sun-700">Account</div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-sun-50" aria-label="Close menu">
                <X className="h-5 w-5 text-ink" />
              </button>
            </div>
            <Nav onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
