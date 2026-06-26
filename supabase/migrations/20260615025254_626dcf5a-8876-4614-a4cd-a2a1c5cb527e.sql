-- Delivery milestones table for delivery-protected escrow
CREATE TABLE public.delivery_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  position int DEFAULT 0,
  is_final boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','disputed')),
  delivery_link text,
  note text,
  submitted_at timestamptz,
  approved_at timestamptz,
  dispute_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_milestones TO authenticated;
GRANT ALL ON public.delivery_milestones TO service_role;

ALTER TABLE public.delivery_milestones ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a party to the booking?
CREATE OR REPLACE FUNCTION public.is_booking_party(_booking_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.photographers p ON p.id = b.photographer_id
    WHERE b.id = _booking_id
      AND (b.customer_id = auth.uid() OR p.profile_id = auth.uid())
  );
$$;

CREATE POLICY "Parties and admins can view delivery milestones"
  ON public.delivery_milestones FOR SELECT TO authenticated
  USING (public.is_booking_party(booking_id) OR public.is_admin());

CREATE POLICY "Parties and admins can update delivery milestones"
  ON public.delivery_milestones FOR UPDATE TO authenticated
  USING (public.is_booking_party(booking_id) OR public.is_admin())
  WITH CHECK (public.is_booking_party(booking_id) OR public.is_admin());

CREATE POLICY "Owning photographer can insert delivery milestones"
  ON public.delivery_milestones FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.photographers p ON p.id = b.photographer_id
      WHERE b.id = booking_id AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY "Parties and admins can delete delivery milestones"
  ON public.delivery_milestones FOR DELETE TO authenticated
  USING (public.is_booking_party(booking_id) OR public.is_admin());

-- Add delivery_status to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS delivery_status text
  NOT NULL DEFAULT 'not_started'
  CHECK (delivery_status IN ('not_started','in_progress','delivered','disputed'));

CREATE INDEX IF NOT EXISTS idx_delivery_milestones_booking ON public.delivery_milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_delivery_milestones_status ON public.delivery_milestones(status);