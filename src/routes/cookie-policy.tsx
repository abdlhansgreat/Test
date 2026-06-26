import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/sun/LegalLayout";

const URL = "https://photolancer.lovable.app/cookie-policy";
const LAST_UPDATED = "15 June 2026";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — PhotoLancer" },
      { name: "description", content: "The cookies PhotoLancer uses, why we use them, and how to control non-essential ones." },
      { property: "og:title", content: "Cookie Policy — PhotoLancer" },
      { property: "og:description", content: "What cookies PhotoLancer uses and how to manage them." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: CookiePolicyPage,
});

const sections: LegalSection[] = [
  {
    id: "what-are-cookies",
    title: "What are cookies?",
    body: (
      <p>
        Cookies are small text files stored on your device when you visit a website. They let the site remember information about your visit — like keeping you
        logged in, or remembering your consent choices.
      </p>
    ),
  },
  {
    id: "cookies-we-use",
    title: "Cookies we use",
    body: (
      <>
        <p>PhotoLancer uses a small number of cookies, grouped as follows:</p>
        <ul>
          <li>
            <strong>Essential cookies</strong> — needed for the site to work: authentication session, security tokens, and your cookie-consent choice itself
            (<code>pl_cookie_consent</code>). These are always on.
          </li>
          <li>
            <strong>Preference cookies</strong> — remember small UI choices such as your selected city or theme.
          </li>
          <li>
            <strong>Analytics cookies</strong> — help us understand which pages are popular and which features are used, in aggregate. We only set these if you
            accept non-essential cookies.
          </li>
        </ul>
        <p>We do not use advertising or cross-site tracking cookies.</p>
      </>
    ),
  },
  {
    id: "consent",
    title: "Your consent",
    body: (
      <p>
        On your first visit you'll see a banner asking whether to accept non-essential cookies. Your choice is stored in a cookie so we don't have to ask on every
        page. You can change your mind at any time by clearing your browser cookies for this site — the banner will reappear on your next visit.
      </p>
    ),
  },
  {
    id: "third-party",
    title: "Third-party cookies",
    body: (
      <p>
        When you make a payment, our payment gateway (Razorpay) may set its own cookies to process the transaction securely. These are governed by Razorpay's own
        privacy and cookie policies.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about cookies? Write to <a href="mailto:privacy@photolancers.in">privacy@photolancers.in</a>.
      </p>
    ),
  },
];

function CookiePolicyPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      intro="A short, plain-English explanation of how PhotoLancer uses cookies."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
