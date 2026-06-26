
-- 1. Columns
ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS claimed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'not_invited',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'photographers_invite_status_check') THEN
    ALTER TABLE public.photographers
      ADD CONSTRAINT photographers_invite_status_check
      CHECK (invite_status IN ('not_invited','invited','claimed'));
  END IF;
END $$;

-- 2. Backfill existing rows (default already true for boolean, but explicit for clarity)
UPDATE public.photographers SET claimed = true, is_published = true WHERE claimed IS NULL OR is_published IS NULL;
UPDATE public.photographers SET invite_status = 'claimed' WHERE claimed = true AND invite_status = 'not_invited';
UPDATE public.photographers SET claimed_at = COALESCE(claimed_at, created_at) WHERE claimed = true AND claimed_at IS NULL;

CREATE INDEX IF NOT EXISTS photographers_is_published_idx ON public.photographers (is_published) WHERE is_published = true;

-- 3. Replace SELECT policy on photographers to gate unpublished profiles
DROP POLICY IF EXISTS "photographers viewable by everyone" ON public.photographers;
CREATE POLICY "photographers viewable when published"
  ON public.photographers
  FOR SELECT
  USING (
    is_published = true
    OR profile_id = auth.uid()
    OR public.is_admin()
  );

-- 4. Replace insert policy on inquiries to block sending to unpublished photographers
DROP POLICY IF EXISTS "inquiries insert by customer" ON public.inquiries;
CREATE POLICY "inquiries insert by customer for published"
  ON public.inquiries
  FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.photographers p
      WHERE p.id = inquiries.photographer_id
        AND p.is_published = true
    )
  );
