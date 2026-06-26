import { supabase } from "@/integrations/supabase/client";

export type NotifyEvent =
  | "welcome"
  | "new_inquiry"
  | "quote_received"
  | "booking_confirmed"
  | "new_message"
  | "review_request"
  | "new_application";

export interface NotifyRecipient {
  user_id?: string;
  email?: string;
  name?: string;
}

/**
 * Fire-and-forget call to the `send-email` edge function. Inserts an in-app
 * notification AND sends a transactional email when RESEND_API_KEY is set;
 * the function falls back to logging when the key is missing.
 */
export async function notify(args: {
  event: NotifyEvent;
  recipients: NotifyRecipient[];
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.functions.invoke("send-email", { body: args });
  } catch (e) {
    // Engagement layer must never block the user-facing action.
    console.warn("[notify] failed", e);
  }
}

/** Resolve a photographer's profile_id (user_id) from photographer id. */
export async function userIdForPhotographer(photographerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("photographers")
    .select("profile_id")
    .eq("id", photographerId)
    .maybeSingle();
  return (data?.profile_id as string | undefined) ?? null;
}
