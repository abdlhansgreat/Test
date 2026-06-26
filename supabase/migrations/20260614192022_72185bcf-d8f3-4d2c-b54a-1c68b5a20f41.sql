
-- 1) Hide profiles.phone from anon/authenticated reads (column-level)
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;

-- 2) Hide subscriptions.gateway_ref from anon/authenticated (admin/service_role retain access)
REVOKE SELECT (gateway_ref) ON public.subscriptions FROM anon, authenticated;

-- 3) Add SELECT/INSERT/UPDATE policies for booking-based contracts
CREATE POLICY "contracts booking parties read"
  ON public.contracts FOR SELECT
  USING (
    booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    )
  );

CREATE POLICY "contracts booking parties insert"
  ON public.contracts FOR INSERT
  WITH CHECK (
    booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    )
  );

CREATE POLICY "contracts booking parties update"
  ON public.contracts FOR UPDATE
  USING (
    booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    )
  )
  WITH CHECK (
    booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = contracts.booking_id
        AND (b.customer_id = auth.uid() OR public.owns_photographer(b.photographer_id))
    )
  );
