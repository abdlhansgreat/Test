import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/sun/LegalLayout";

const URL = "https://photolancer.lovable.app/privacy";
const LAST_UPDATED = "15 June 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — PhotoLancer" },
      { name: "description", content: "How PhotoLancer collects, uses and protects your personal data, and how to exercise your rights including deletion." },
      { property: "og:title", content: "Privacy Policy — PhotoLancer" },
      { property: "og:description", content: "Your data, your rights — how PhotoLancer handles personal information." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PrivacyPage,
});

const sections: LegalSection[] = [
  {
    id: "intro",
    title: "Introduction",
    body: (
      <p>
        This Privacy Policy explains what personal data PhotoLancer collects when you use our marketplace, how we use it, who we share it with, and the rights
        you have over it. PhotoLancer is based in India and operates under Indian data-protection law, including the Digital Personal Data Protection Act, 2023.
      </p>
    ),
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    body: (
      <>
        <p>We collect the following categories of personal data:</p>
        <ul>
          <li><strong>Account data</strong> — name, email, password (hashed), phone number, role (client or photographer).</li>
          <li><strong>Profile and listing data</strong> — display name, bio, base city, genres, packages, pricing, portfolio images, social handles.</li>
          <li><strong>Booking data</strong> — event details, dates, locations, messages and contracts exchanged between users.</li>
          <li><strong>Payment metadata</strong> — booking amount, payment status, gateway references and payout details. We do <strong>not</strong> store full card numbers, UPI VPAs or bank credentials — these are processed by our payment gateway (Razorpay).</li>
          <li><strong>Usage data</strong> — pages viewed, profile views, search queries, device type, IP address, approximate location, and cookies (see our <a href="/cookie-policy">Cookie Policy</a>).</li>
          <li><strong>Communications</strong> — messages sent through PhotoLancer, support tickets, and contact-form submissions.</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    body: (
      <>
        <p>We use your data to:</p>
        <ul>
          <li>Create and manage your account, profile and listings.</li>
          <li>Connect clients and photographers, process bookings, and hold funds in escrow.</li>
          <li>Show relevant photographers in search, on category pages and on the homepage.</li>
          <li>Send transactional emails (booking confirmations, payouts, contracts) and important service updates.</li>
          <li>Detect, prevent and respond to fraud, abuse and platform misuse.</li>
          <li>Improve the product through aggregated, de-identified analytics.</li>
          <li>Comply with legal obligations (tax, accounting, lawful requests).</li>
        </ul>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third parties we share data with",
    body: (
      <>
        <p>We share the minimum data needed with carefully selected service providers:</p>
        <ul>
          <li><strong>Razorpay</strong> — payment processing and payouts.</li>
          <li><strong>Lovable Cloud / Supabase</strong> — secure database, authentication and file storage.</li>
          <li><strong>Email and notification providers</strong> — to deliver transactional emails and alerts.</li>
          <li><strong>Analytics providers</strong> — to understand aggregated usage patterns (only when you consent to non-essential cookies).</li>
          <li><strong>Meta / Instagram</strong> — only if you choose to connect your Instagram account to import portfolio content.</li>
        </ul>
        <p>We do not sell your personal data. We may disclose data when required by law or to protect users and the platform from harm.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        We use a small number of cookies to keep you logged in, remember your preferences and (with consent) understand usage. You can accept or decline
        non-essential cookies from the banner shown on first visit. For details, see our <a href="/cookie-policy">Cookie Policy</a>.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate or outdated data from your profile and account settings.</li>
          <li>Withdraw consent for optional processing (e.g. analytics cookies).</li>
          <li>Request deletion of your account and personal data (see below).</li>
          <li>Lodge a complaint with the Data Protection Board of India.</li>
        </ul>
      </>
    ),
  },
  {
    id: "retention-deletion",
    title: "Data retention and deletion",
    body: (
      <>
        <p>
          We keep your data for as long as your account is active. Booking records, invoices and payment metadata may be retained for up to 8 years after the
          transaction, as required by Indian tax and accounting laws. Aggregated, de-identified analytics may be retained indefinitely.
        </p>
        <p>
          <strong>To request deletion of your account and personal data</strong>, email{" "}
          <a href="mailto:privacy@photolancers.in">privacy@photolancers.in</a> from the address on file, or use the "Delete account" option in your settings. We
          will action verified requests within 30 days, except for records we are legally required to retain. If you connected your Instagram / Meta account, the
          same request also revokes our access and deletes the data we received from Meta.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We use industry-standard measures including encryption in transit (TLS), row-level security on our database, hashed passwords and least-privilege access
        controls. No system is perfectly secure — please use a strong, unique password and report any suspicious activity to us immediately.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        PhotoLancer is not intended for users under the age of 18. We do not knowingly collect personal data from children. If you believe a minor has provided
        us data, please contact us so we can remove it.
      </p>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    body: (
      <p>
        We may update this Privacy Policy from time to time. Material changes will be highlighted in-app or by email. For privacy questions, contact our grievance
        officer at <a href="mailto:privacy@photolancers.in">privacy@photolancers.in</a>.
      </p>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="What we collect, why we collect it, and the choices you have."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
