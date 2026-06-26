import { Link } from "@tanstack/react-router";
import { Aperture, Instagram, Twitter, Youtube } from "lucide-react";
import { NewsletterSignup } from "./NewsletterSignup";

const footerCities = [
  { name: "Delhi NCR", slug: "delhi-ncr" },
  { name: "Mumbai", slug: "mumbai" },
  { name: "Bengaluru", slug: "bengaluru" },
  { name: "Hyderabad", slug: "hyderabad" },
  { name: "Chennai", slug: "chennai" },
  { name: "Pune", slug: "pune" },
  { name: "Jaipur", slug: "jaipur" },
  { name: "Kolkata", slug: "kolkata" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sun-50">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-soft">
                <Aperture className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-display text-[22px] font-extrabold text-ink">PhotoLancer</span>
            </div>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
              India's photographer marketplace and network. Find a photographer you'll actually love — or get discovered and booked.
            </p>
            <div className="mt-5 flex gap-2">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" aria-label="social" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink transition hover:text-sun-600">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="mt-8"><NewsletterSignup /></div>
          </div>

          <FooterCol
            title="For clients"
            links={[
              { label: "Browse photographers", to: "/search" },
              { label: "Real-shoot inspiration", to: "/inspiration" },
              { label: "Guides & blog", to: "/blog" },
              { label: "How it works", to: "/how-it-works" },
              { label: "Saved photographers", to: "/saved" },
            ]}
          />
          <FooterCol
            title="For photographers"
            links={[
              { label: "Join free", to: "/for-photographers" },
              { label: "Pricing", to: "/pricing" },
              { label: "Find second-shoots", to: "/gigs" },
              { label: "Studio dashboard", to: "/studio" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "About", to: "/about" },
              { label: "Trust & Safety", to: "/trust-and-safety" },
              { label: "FAQ", to: "/faq" },
              { label: "Contact", to: "/contact" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: "Terms of Service", to: "/terms" },
              { label: "Privacy policy", to: "/privacy" },
              { label: "Refund policy", to: "/refund-policy" },
              { label: "Cookie policy", to: "/cookie-policy" },
            ]}
          />

        </div>

        <div className="mt-12 border-t border-line pt-6">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-sun-700">Photographers by city</div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            {footerCities.map((c) => (
              <Link key={c.slug} to="/c/$category/$city" params={{ category: "wedding", city: c.slug }} className="hover:text-ink">
                {c.name}
              </Link>
            ))}
          </div>
          <div className="mt-6 text-sm text-ink-muted">© {new Date().getFullYear()} PhotoLancer · photolancers.in</div>
        </div>
      </div>
    </footer>
  );
}

type LinkItem = { label: string; to?: string; href?: string };

function FooterCol({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-[15px] text-ink-muted">
        {links.map((l) =>
          l.to ? (
            <li key={l.label}>
              <Link to={l.to} className="hover:text-ink">{l.label}</Link>
            </li>
          ) : (
            <li key={l.label}>
              <a href={l.href} className="hover:text-ink">{l.label}</a>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
