// Featured plan pricing config. Admin-tunable later via DB.
// Note: the booking commission rate (see src/lib/booking-config.ts) remains the
// core revenue line — Featured is an additive monetization layer, never a
// per-lead charge. Both will become admin-configurable in a future phase.
export const FEATURED_PRICE_INR = 999;
export const FEATURED_PERIOD_DAYS = 30;

export const FEATURED_BENEFITS = [
  'A gold "Featured" badge on your card and profile',
  'Top placement in search "Recommended" sort',
  'A homepage slot in "Featured near you"',
  "Priority support from the PhotoLancer team",
];

export const FREE_BENEFITS = [
  "Unlimited inquiries and bookings",
  "Secure escrow payouts (released next day)",
  "Verified reviews tied to real bookings",
  "Standard search placement",
];
