// Platform-wide config. Booking commission is the core revenue line — we never
// charge per lead. Featured listings (see src/lib/billing-config.ts) are an
// additive monetization layer.
// TODO: make COMMISSION_RATE admin-configurable via DB in the next phase.
export const COMMISSION_RATE = 0.10; // 10%

// Delivery-protected escrow auto-release window: once a photographer submits
// the FINAL delivery milestone, the customer has this many days to approve
// or raise an issue before escrow auto-releases to the photographer.
export const AUTO_RELEASE_DAYS = 7;

export function calcCommission(amount: number) {
  return Math.round(amount * COMMISSION_RATE);
}

export function inr(n: number | null | undefined) {
  if (n == null) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}
