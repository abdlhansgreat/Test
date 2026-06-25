import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection } from "@/components/sun/LegalLayout";

const URL = "https://photolancer.lovable.app/refund-policy";
const LAST_UPDATED = "15 June 2026";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Cancellation & Refund Policy — PhotoLancer" },
      { name: "description", content: "How cancellations, refunds, the escrow release schedule and disputes work on PhotoLancer." },
      { property: "og:title", content: "Cancellation & Refund Policy — PhotoLancer" },
      { property: "og:description", content: "Clear, fair rules for cancellations, refunds and dispute resolution." },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: RefundPage,
});

const sections: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    body: (
      <p>
        Every booking on PhotoLancer is paid up-front and held in <strong>escrow</strong> until the shoot is complete. This policy explains what happens when a
        booking is cancelled, the timelines for refunds, when funds are released to the photographer, and how disputes are resolved.
      </p>
    ),
  },
  {
    id: "client-cancellation",
    title: "Cancellation by the client",
    body: (
      <>
        <p>Unless the photographer's listing specifies stricter terms, the default cancellation slabs are:</p>
        <ul>
          <li><strong>More than 30 days before the event</strong> — full refund, less payment-gateway charges.</li>
          <li><strong>15 to 30 days before the event</strong> — 50% refund.</li>
          <li><strong>Less than 15 days before the event</strong> — no refund (the photographer has reserved the date and likely turned away other work).</li>
        </ul>
        <p>
          The photographer's listing may publish more generous terms — those override the defaults. Photographers cannot publish terms that are <em>less</em>{" "}
          generous than the defaults above without flagging them prominently before checkout.
        </p>
      </>
    ),
  },
  {
    id: "photographer-cancellation",
    title: "Cancellation by the photographer",
    body: (
      <p>
        If the photographer cancels for any reason other than a documented emergency, the client is entitled to a <strong>100% refund</strong>, and PhotoLancer
        will help find a replacement photographer of comparable standing where possible. Repeated cancellations may result in account suspension and loss of
        verification.
      </p>
    ),
  },
  {
    id: "escrow-release",
    title: "Escrow release schedule",
    body: (
      <>
        <p>Funds are released from escrow to the photographer's payout account as follows:</p>
        <ul>
          <li><strong>Day of shoot</strong> — booking moves to "shoot completed" once the photographer marks it complete and the client confirms.</li>
          <li><strong>+72 hours</strong> — if the client does not raise a dispute within 72 hours of "shoot completed", funds are auto-released.</li>
          <li><strong>Payout settlement</strong> — payouts are settled via Razorpay within <strong>2–5 working days</strong> after release, depending on bank processing times.</li>
        </ul>
        <p>PhotoLancer's commission is deducted at the point of release. GST and gateway fees may also apply.</p>
      </>
    ),
  },
  {
    id: "refund-timelines",
    title: "Refund timelines",
    body: (
      <>
        <p>Approved refunds are initiated to the original payment method within <strong>3 working days</strong>. The time taken to reflect in your account depends on your bank and payment method:</p>
        <ul>
          <li><strong>UPI</strong> — typically within 24 hours of initiation.</li>
          <li><strong>Credit/debit cards</strong> — typically 5–7 working days.</li>
          <li><strong>Net banking</strong> — typically 3–5 working days.</li>
        </ul>
        <p>Payment-gateway charges on the original transaction may be non-refundable.</p>
      </>
    ),
  },
  {
    id: "non-refundable",
    title: "What is non-refundable",
    body: (
      <ul>
        <li>Featured listing fees, once the Featured placement has gone live.</li>
        <li>Payment-gateway charges already incurred on the original transaction.</li>
        <li>Bookings completed and accepted by the client without a dispute raised within the 72-hour window.</li>
      </ul>
    ),
  },
  {
    id: "disputes",
    title: "Disputes and resolution",
    body: (
      <>
        <p>
          A dispute can be raised within 72 hours of "shoot completed" from your booking page. Disputes pause the escrow release. The PhotoLancer support team
          will:
        </p>
        <ol>
          <li>Acknowledge the dispute within 1 working day.</li>
          <li>Review messages, contracts and any uploaded deliverables.</li>
          <li>Mediate between the client and photographer to arrive at a fair outcome — full refund, partial refund, re-shoot, or release of funds.</li>
          <li>Issue a decision within 7 working days. The decision is binding for the limited purpose of releasing escrow.</li>
        </ol>
        <p>
          If you remain dissatisfied, you may pursue remedies available to you under Indian law, including the Consumer Protection Act, 2019. The exclusive
          jurisdiction is the courts at Bengaluru, Karnataka.
        </p>
      </>
    ),
  },
  {
    id: "force-majeure",
    title: "Force majeure",
    body: (
      <p>
        If a shoot becomes impossible due to events beyond reasonable control (natural disasters, lockdowns, serious illness, government restrictions),
        PhotoLancer will work with both parties to either reschedule the booking, transfer it to a comparable photographer, or refund the client in full. No
        penalties apply to either party in a documented force-majeure cancellation.
      </p>
    ),
  },
  {
    id: "contact",
    title: "How to contact us",
    body: (
      <p>
        Email <a href="mailto:support@photolancers.in">support@photolancers.in</a> for any cancellation, refund or dispute query. Include your booking ID — it
        helps us respond faster.
      </p>
    ),
  },
];

function RefundPage() {
  return (
    <LegalLayout
      title="Cancellation & Refund Policy"
      intro="How cancellations, refunds, escrow release and disputes work on PhotoLancer."
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  );
}
