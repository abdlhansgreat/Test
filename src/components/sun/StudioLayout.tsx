import { ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Inbox, CalendarDays, CalendarCheck, Wallet, Settings, Image as ImageIcon,
  Package as PackageIcon, Star, Briefcase, CreditCard, Menu, X, Truck,
} from "lucide-react";
import { Navbar } from "./Navbar";

const items = [
  { to: "/studio", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/studio/leads", label: "Leads", icon: Inbox },
  { to: "/studio/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/studio/deliverables", label: "Deliverables", icon: Truck },
  { to: "/studio/availability", label: "Calendar", icon: CalendarDays },
  { to: "/studio/earnings", label: "Earnings", icon: Wallet },
  { to: "/onboarding", label: "Profile", icon: Settings },
  { to: "/studio/portfolio", label: "Portfolio", icon: ImageIcon },
  { to: "/studio/packages", label: "Packages", icon: PackageIcon },
  { to: "/studio/reviews", label: "Reviews", icon: Star },
  { to: "/studio/gigs", label: "Gigs", icon: Briefcase },
  { to: "/studio/billing", label: "Billing", icon: CreditCard },
] as const;

export function StudioLayout({ children, title }: { children: ReactNode; title?: string }) {
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
        {/* Mobile bar */}
        <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <span className="font-display text-lg font-extrabold text-ink">{title ?? "Studio"}</span>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow-soft"
            aria-label="Open studio menu"
          >
            <Menu className="h-4 w-4" /> Menu
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <div className="sticky top-24 rounded-3xl border border-line bg-white p-3 shadow-soft">
              <div className="px-3 pb-3 pt-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-sun-700">Studio</div>
              </div>
              <Nav />
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto bg-white p-5 shadow-warm">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-sun-700">Studio</div>
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
