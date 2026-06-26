import { supabase } from "@/integrations/supabase/client";
import { COMMISSION_RATE } from "@/lib/booking-config";
import { findOrCreateConversation } from "@/lib/messaging";

export const GIG_ROLES = [
  { key: "second_shooter", label: "Second shooter" },
  { key: "associate", label: "Associate photographer" },
  { key: "cinematographer", label: "Cinematographer" },
] as const;

export type GigRole = typeof GIG_ROLES[number]["key"];

export function gigRoleLabel(role: string | null | undefined): string {
  return GIG_ROLES.find((r) => r.key === role)?.label ?? "Crew";
}

export interface ContractTerms {
  role: string;
  event_date: string | null;
  city: string | null;
  day_rate: number | null;
  payment_terms: string;
  cancellation: string;
  governing_law: string;
}

export function defaultContractDefaults(opts: {
  role: string;
  event_date: string | null;
  city: string | null;
  day_rate: number | null;
}) {
  const terms: ContractTerms = {
    role: opts.role,
    event_date: opts.event_date,
    city: opts.city,
    day_rate: opts.day_rate,
    payment_terms:
      "Full day rate paid via PhotoLancer escrow before the shoot and released to the freelancer within T+1 business day after the event is marked complete by the hiring studio.",
    cancellation:
      "Cancellation within 72 hours of the event entitles the freelancer to 50% of the day rate. Force majeure events are excluded.",
    governing_law: "This agreement is governed by the laws of India.",
  };
  const copyright_terms =
    "All final edited images and footage produced under this engagement are owned by the hiring studio / lead photographer. Raw files are not delivered unless explicitly agreed in writing.";
  const usage_terms =
    "The freelancer may use up to 10 selected images/clips in their personal portfolio and social channels, with credit to the hiring studio, unless the hiring studio restricts this in writing.";
  return { terms, copyright_terms, usage_terms };
}

/** Accept an application: flip statuses, create conversation, contract, and a booking that reuses escrow. */
export async function acceptApplication(opts: {
  application: {
    id: string;
    gig_id: string;
    applicant_id: string;
    quoted_rate: number | null;
  };
  gig: {
    id: string;
    posted_by: string;
    title: string;
    role: string;
    event_date: string | null;
    city: string | null;
    day_rate: number | null;
  };
}): Promise<{ booking_id: string; contract_id: string }> {
  const { application, gig } = opts;

  // poster's profile_id (acts as customer on the booking)
  const { data: poster } = await supabase
    .from("photographers")
    .select("profile_id")
    .eq("id", gig.posted_by)
    .maybeSingle();
  if (!poster?.profile_id) throw new Error("Poster profile not found");

  // freelancer's profile_id (for conversation)
  const { data: freelancer } = await supabase
    .from("photographers")
    .select("profile_id")
    .eq("id", application.applicant_id)
    .maybeSingle();
  if (!freelancer?.profile_id) throw new Error("Freelancer profile not found");

  // 1) accept this one, decline the rest
  await supabase
    .from("gig_applications")
    .update({ status: "accepted" })
    .eq("id", application.id);
  await supabase
    .from("gig_applications")
    .update({ status: "declined" })
    .eq("gig_id", gig.id)
    .neq("id", application.id)
    .neq("status", "declined");

  // 2) fill the gig
  await supabase.from("gigs").update({ status: "filled" }).eq("id", gig.id);

  // 3) conversation
  try {
    await findOrCreateConversation(freelancer.profile_id);
  } catch {
    /* ignore */
  }

  // 4) booking — reuse escrow flow
  const amount = Number(application.quoted_rate ?? gig.day_rate ?? 0);
  const commission_amount = Math.round(amount * COMMISSION_RATE * 100) / 100;
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .insert({
      customer_id: poster.profile_id,
      photographer_id: application.applicant_id,
      gig_id: gig.id,
      event_date: gig.event_date,
      amount,
      commission_amount,
      status: "pending",
      escrow_status: "pending",
    })
    .select("id")
    .single();
  if (bErr || !booking) throw bErr ?? new Error("Booking insert failed");

  // 5) contract
  const defaults = defaultContractDefaults({
    role: gig.role,
    event_date: gig.event_date,
    city: gig.city,
    day_rate: amount,
  });
  const { data: contract, error: cErr } = await supabase
    .from("contracts")
    .insert({
      gig_id: gig.id,
      gig_application_id: application.id,
      booking_id: booking.id,
      template_type: "b2b_freelance_v1",
      terms_json: defaults.terms as any,
      copyright_terms: defaults.copyright_terms,
      usage_terms: defaults.usage_terms,
    })
    .select("id")
    .single();
  if (cErr || !contract) throw cErr ?? new Error("Contract insert failed");

  return { booking_id: booking.id, contract_id: contract.id };
}
