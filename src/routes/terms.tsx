import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/sun/LegalLayout";

const URL = "https://photolancer.lovable.app/terms";
const LAST_UPDATED = "15 June 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — PhotoLancer" },
      { name: "description", content: "The terms that govern your use of PhotoLancer — India's photographer marketplace and network." },
      { property: "og:title", content: "Terms of Service — PhotoLancer" },
      { property: "og:description", content: "Accounts, bookings, commission, content rights and the rules of the road for clients and photographers." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TermsPage,
});

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    body: (
      <>
        <p>
          PhotoLancer ("PhotoLancer", "we", "us") is a marketplace operated from India that connects clients with photographers, and connects studios with
          freelance second shooters. By creating an account or using the platform you agree to these Terms of Service together with our{" "}
          <a href="/privacy">Privacy Policy</a>, <a href="/refund-policy">Refund Policy</a> and <a href="/cookie-policy">Cookie Policy</a>.
        </p>
        <p>If you do not agree, please do not use the platform.</p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and roles",
    body: (
      <>
        <p>You can use PhotoLancer in one of two roles, or both:</p>
        <ul>
          <li><strong>Client</strong> — anyone hiring a photographer for an event, shoot or project.</li>
          <li><strong>Photographer</strong> — verified working professionals listing services, accepting bookings, or applying to studio gigs as a second shooter.</li>
        </ul>
        <p>
          You must be at least 18 years old to create an account. You are responsible for keeping your login secure and for all activity on your account.
          Provide accurate information and keep it up to date. We may suspend or terminate accounts that breach these Terms.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Post unlawful, misleading, hateful, sexually explicit, or infringing content.</li>
          <li>Impersonate another person or photographer, or misrepresent your work.</li>
          <li>Solicit clients or photographers off-platform to evade commission ("circumvention").</li>
          <li>Scrape, copy or resell PhotoLancer data without written permission.</li>
          <li>Interfere with the platform's security, integrity or performance.</li>
        </ul>
        <p>We may remove content or restrict accounts that violate these rules.</p>
      </>
    ),
  },
  {
    id: "listings-content",
    title: "Listings and content",
    body: (
      <>
        <p>
          Photographers upload profile information, packages, pricing and portfolio images ("Listing Content"). You confirm you own the rights to the content you
          upload, or that you have permission from everyone who appears in it.
        </p>
        <p>
          You retain ownership of your Listing Content. You grant PhotoLancer a worldwide, royalty-free, non-exclusive licence to host, display, resize and
          promote that content on PhotoLancer (including in search results, category pages, social previews and the homepage) for as long as your account is
          active and for a reasonable period afterwards to honour cached/indexed copies.
        </p>
      </>
    ),
  },
  {
    id: "bookings-payments",
    title: "Bookings, escrow and payments",
    body: (
      <>
        <p>
          When a client books a photographer, payment is collected through our payment gateway and held in escrow. Funds are released to the photographer after
          the event/shoot is delivered, subject to our <a href="/refund-policy">Cancellation & Refund Policy</a>.
        </p>
        <p>
          Photographers receive their payout net of PhotoLancer's commission (currently 10% of the booking value; the rate is configurable by PhotoLancer and any
          change will be communicated in advance). Payment gateway charges and applicable taxes (including GST) may also apply.
        </p>
        <p>
          PhotoLancer is the limited collection agent for booking payments only. It is not a bank, escrow agent in the regulatory sense, or party to the actual
          photography service contract between client and photographer.
        </p>
      </>
    ),
  },
  {
    id: "featured",
    title: "Featured listings",
    body: (
      <p>
        Photographers may purchase a Featured listing for a monthly fee, which boosts visibility in search and on the homepage during the active period.
        Featured fees are non-refundable once the listing is live. Featured placement does not constitute an endorsement and does not change the rules around
        verification, reviews or escrow.
      </p>
    ),
  },
  {
    id: "b2b-gigs",
    title: "B2B gigs and independent contractors",
    body: (
      <>
        <p>
          Studios may post second-shooter gigs. When a gig is accepted, PhotoLancer generates a digital contract between the studio and the photographer.
        </p>
        <p>
          Photographers engaged through gigs are <strong>independent contractors</strong>, not employees of either the studio or PhotoLancer. Each party is
          responsible for its own taxes, insurance and statutory contributions. PhotoLancer does not provide employment benefits, PF, ESI, or workers'
          compensation, and is not liable for any claim arising from the working relationship between studio and contractor.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property & portfolio rights",
    body: (
      <>
        <p>
          Copyright in delivered photographs belongs to the photographer unless explicitly assigned in writing. Unless a contract says otherwise, photographers
          may use images from completed shoots in their personal and PhotoLancer portfolios, with reasonable client privacy in mind.
        </p>
        <p>
          PhotoLancer's name, logo, design system, software and aggregated platform data are owned by PhotoLancer and protected by Indian and international IP laws.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers and limitation of liability",
    body: (
      <>
        <p>
          PhotoLancer is provided on an "as is" basis. We do not guarantee that any specific photographer is available, qualified for a specific shoot, or that
          a particular outcome will be achieved. We make no warranties, express or implied, beyond those that cannot be excluded under applicable law.
        </p>
        <p>
          To the maximum extent permitted by law, PhotoLancer's aggregate liability arising out of or relating to your use of the platform shall not exceed the
          commission actually earned by PhotoLancer on the specific booking giving rise to the claim. We are not liable for indirect, incidental, consequential
          or punitive damages.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <p>
        You may close your account at any time from your dashboard or by writing to <a href="mailto:hello@photolancers.in">hello@photolancers.in</a>. We may
        suspend or terminate accounts for violations of these Terms, suspected fraud, payment chargebacks, or in response to a lawful order. Active bookings will
        be honoured or refunded as per the Refund Policy.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These Terms are governed by the laws of India. Subject to the dispute-resolution mechanism in the Refund Policy, the courts at Bengaluru, Karnataka shall
        have exclusive jurisdiction over any dispute arising out of or in connection with these Terms.
      </p>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    body: (
      <p>
        We may update these Terms from time to time. We will notify you of material changes by email or in-app. Questions? Write to{" "}
        <a href="mailto:hello@photolancers.in">hello@photolancers.in</a>.
      </p>
    ),
  },
];

function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro="The rules of the road for clients and photographers using PhotoLancer."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
