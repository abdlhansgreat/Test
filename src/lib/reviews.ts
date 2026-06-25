import { supabase } from "@/integrations/supabase/client";

export interface ReviewRow {
  id: string;
  booking_id: string;
  reviewer_id: string;
  photographer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified: boolean;
  created_at: string;
  profiles?: { full_name: string | null } | null;
  review_replies?: { id: string; body: string; created_at: string } | null;
}

export async function fetchPhotographerReviews(photographerId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(`*, profiles:reviewer_id(full_name), review_replies(id, body, created_at)`)
    .eq("photographer_id", photographerId)
    .eq("hidden", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    review_replies: Array.isArray(r.review_replies) ? r.review_replies[0] ?? null : r.review_replies,
  })) as ReviewRow[];
}

export function computeDistribution(reviews: { rating: number }[]) {
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const k = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    dist[k] += 1;
  }
  return dist;
}
