
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS portfolio_items_verified_idx ON public.portfolio_items(photographer_id, verified);

CREATE TABLE IF NOT EXISTS public.portfolio_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_item_id uuid NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.portfolio_reports TO authenticated;
GRANT ALL ON public.portfolio_reports TO service_role;

ALTER TABLE public.portfolio_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can report portfolio items"
  ON public.portfolio_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view portfolio reports"
  ON public.portfolio_reports FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete portfolio reports"
  ON public.portfolio_reports FOR DELETE TO authenticated
  USING (public.is_admin());
