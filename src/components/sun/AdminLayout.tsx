import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ShieldCheck, Flag, Users, Wallet, Sparkles,
  Tag, MapPin, Settings as SettingsIcon, Menu, X, BookOpen, Mail, Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/sun/Navbar";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const items: Item[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { to: "/admin/moderation", label: "Moderation", icon: Flag },
  { to: "/admin/portfolio-reports", label: "Portfolio reports", icon: ImageIcon },
  { to: "/admin/photographers", label: "Photographers", icon: Users },
  { to: "/admin/bookings", label: "Bookings & Payouts", icon: Wallet },
  { to: "/admin/featured", label: "Featured", icon: Sparkles },
  { to: "/admin/imagery", label: "Imagery", icon: ImageIcon },
  { to: "/admin/blog", label: "Blog", icon: BookOpen },
  { to: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { to: "/admin/genres", label: "Genres", icon: Tag },
  { to: "/admin/cities", label: "Cities", icon: MapPin },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-8 px-5 py-8 md:px-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-24 rounded-3xl border border-line bg-white p-3 shadow-soft">
            <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-sun-700">
              Admin
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((it) => {
                const active = isActive(it.to, it.exact);
                return (
                  <Link
                    key={it.to}
                    to={it.to as never}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-gradient-primary text-white shadow-soft"
                        : "text-ink hover:bg-sun-50 hover:text-sun-700",
                    )}
                  >
                    <it.icon className="h-4 w-4" />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile drawer toggle */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-white shadow-warm md:hidden"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {open && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-ink/60" />
            <div className="absolute right-0 top-0 h-full w-72 bg-white p-4 shadow-warm" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-sun-700">Admin</span>
                <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex flex-col gap-1">
                {items.map((it) => {
                  const active = isActive(it.to, it.exact);
                  return (
                    <Link
                      key={it.to}
                      to={it.to as never}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold",
                        active ? "bg-gradient-primary text-white" : "text-ink hover:bg-sun-50",
                      )}
                    >
                      <it.icon className="h-4 w-4" /> {it.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] font-extrabold leading-tight text-ink md:text-[34px]">{title}</h1>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
