
-- Reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviewer can insert from completed booking" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
    )
  );
CREATE POLICY "Reviewer can update own" ON public.reviews
  FOR UPDATE TO authenticated USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Reviewer can delete own" ON public.reviews
  FOR DELETE TO authenticated USING (reviewer_id = auth.uid());
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Review replies
CREATE TABLE public.review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.review_replies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_replies TO authenticated;
GRANT ALL ON public.review_replies TO service_role;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies public read" ON public.review_replies FOR SELECT USING (true);
CREATE POLICY "Owner photographer can insert reply" ON public.review_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      JOIN public.photographers p ON p.id = r.photographer_id
      WHERE r.id = review_id AND p.profile_id = auth.uid()
    )
  );
CREATE POLICY "Owner photographer can update reply" ON public.review_replies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      JOIN public.photographers p ON p.id = r.photographer_id
      WHERE r.id = review_id AND p.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      JOIN public.photographers p ON p.id = r.photographer_id
      WHERE r.id = review_id AND p.profile_id = auth.uid()
    )
  );
CREATE POLICY "Admins manage replies" ON public.review_replies FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER review_replies_updated_at BEFORE UPDATE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Review reports
CREATE TABLE public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.review_reports TO authenticated;
GRANT ALL ON public.review_reports TO service_role;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporter can insert" ON public.review_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins read reports" ON public.review_reports
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins manage reports" ON public.review_reports FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Aggregate trigger
CREATE OR REPLACE FUNCTION public.recompute_photographer_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
BEGIN
  _pid := COALESCE(NEW.photographer_id, OLD.photographer_id);
  UPDATE public.photographers p
    SET rating_avg = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.reviews WHERE photographer_id = _pid), 0),
        review_count = (SELECT COUNT(*) FROM public.reviews WHERE photographer_id = _pid)
    WHERE p.id = _pid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER reviews_aggregate_ins AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_photographer_rating();
CREATE TRIGGER reviews_aggregate_upd AFTER UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_photographer_rating();
CREATE TRIGGER reviews_aggregate_del AFTER DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_photographer_rating();
