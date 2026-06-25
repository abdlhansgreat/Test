import { supabase } from "@/integrations/supabase/client";

export type MediaBucket = "portfolio" | "avatars" | "attachments";

/**
 * Resolve a media URL stored in DB. If it's already a full http(s) URL we
 * return it as-is. Otherwise we treat it as a path inside `bucket` and
 * sign it. Signed URLs work for both authenticated and anonymous viewers
 * as long as the bucket's RLS policy permits the SELECT.
 */
export async function resolveMediaUrl(
  value: string | null | undefined,
  bucket: MediaBucket = "portfolio",
  expiresIn = 60 * 60,
): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(value, expiresIn);
  return data?.signedUrl ?? null;
}

export async function resolveMediaUrls(
  values: (string | null | undefined)[],
  bucket: MediaBucket = "portfolio",
  expiresIn = 60 * 60,
): Promise<(string | null)[]> {
  return Promise.all(values.map((v) => resolveMediaUrl(v, bucket, expiresIn)));
}
