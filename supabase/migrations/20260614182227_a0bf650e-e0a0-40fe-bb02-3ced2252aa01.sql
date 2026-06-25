CREATE TABLE public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.profile_views TO anon, authenticated;
GRANT SELECT ON public.profile_views TO authenticated;
GRANT ALL ON public.profile_views TO service_role;

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can record profile views"
  ON public.profile_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "owner can read own profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_id AND p.profile_id = auth.uid()));

CREATE POLICY "admin can read profile views"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX profile_views_photographer_idx ON public.profile_views(photographer_id, viewed_at DESC);