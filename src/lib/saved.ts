import { supabase } from "@/integrations/supabase/client";

export async function loadSavedSet(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("saved_photographers")
    .select("photographer_id")
    .eq("customer_id", userId);
  return new Set((data ?? []).map((r) => r.photographer_id));
}

export async function toggleSaved(
  userId: string,
  photographerId: string,
  currentlySaved: boolean,
): Promise<boolean> {
  if (currentlySaved) {
    const { error } = await supabase
      .from("saved_photographers")
      .delete()
      .eq("customer_id", userId)
      .eq("photographer_id", photographerId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("saved_photographers")
    .insert({ customer_id: userId, photographer_id: photographerId });
  if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
  return true;
}
