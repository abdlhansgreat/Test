
-- 1) Lock down platform_settings: admins only on the table; expose pricing via SECURITY DEFINER fn
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;

CREATE POLICY "Admins can read platform settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE SELECT ON public.platform_settings FROM anon, authenticated;
GRANT SELECT ON public.platform_settings TO authenticated; -- RLS still restricts to admins

CREATE OR REPLACE FUNCTION public.get_public_pricing()
RETURNS TABLE(commission_rate numeric, featured_price numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT commission_rate, featured_price
  FROM public.platform_settings
  ORDER BY updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_pricing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_pricing() TO anon, authenticated;

-- 2) Close the contracts NULL-booking_id gap: guarantee every contract is linked
--    to a booking OR a gig, and consolidate the read/write policies so the two
--    paths can't leak past each other when one side is NULL.

-- Backfill / sanity: delete orphaned contracts (no booking and no gig).
DELETE FROM public.contracts WHERE booking_id IS NULL AND gig_id IS NULL;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_link_required;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_link_required
  CHECK (booking_id IS NOT NULL OR gig_id IS NOT NULL);

-- Rebuild contract policies as a single coherent set.
DROP POLICY IF EXISTS "contracts booking parties insert" ON public.contracts;
DROP POLICY IF EXISTS "contracts booking parties read"   ON public.contracts;
DROP POLICY IF EXISTS "contracts booking parties update" ON public.contracts;
DROP POLICY IF EXISTS "contracts parties insert"         ON public.contracts;
DROP POLICY IF EXISTS "contracts parties read"           ON public.contracts;
DROP POLICY IF EXISTS "contracts parties update"         ON public.contracts;

CREATE POLICY "contracts parties read"
  ON public.contracts FOR SELECT TO authenticated
  USING (
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    ))
    OR
    (gig_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = contracts.gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    ))
  );

CREATE POLICY "contracts parties insert"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    ))
    OR
    (gig_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = contracts.gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    ))
  );

CREATE POLICY "contracts parties update"
  ON public.contracts FOR UPDATE TO authenticated
  USING (
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    ))
    OR
    (gig_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = contracts.gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    ))
  )
  WITH CHECK (
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    ))
    OR
    (gig_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = contracts.gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    ))
  );
