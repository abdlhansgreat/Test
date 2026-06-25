import { supabase } from "@/integrations/supabase/client";

/**
 * Find or create a conversation between the current user and `otherProfileId`.
 * Uses a server-side normalized-pair RPC so pairs never duplicate.
 */
export async function findOrCreateConversation(otherProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc("find_or_create_conversation", {
    _other: otherProfileId,
  });
  if (error) throw error;
  if (!data) throw new Error("Could not create conversation");
  return data as unknown as string;
}

/** Get the total unread messages addressed to the current user (excludes self-sent). */
export async function getUnreadCount(userId: string): Promise<number> {
  // Conversations the user is in
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);
  const ids = (convs ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return 0;
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", userId)
    .eq("read", false);
  return count ?? 0;
}
