
CREATE TABLE public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('instagram','upload','link')),
  media_url text,
  thumbnail_url text,
  caption text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_items viewable by everyone"
  ON public.portfolio_items FOR SELECT USING (true);

CREATE POLICY "owners insert own portfolio_items"
  ON public.portfolio_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = portfolio_items.photographer_id AND p.profile_id = auth.uid()
  ));

CREATE POLICY "owners update own portfolio_items"
  ON public.portfolio_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = portfolio_items.photographer_id AND p.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = portfolio_items.photographer_id AND p.profile_id = auth.uid()
  ));

CREATE POLICY "owners delete own portfolio_items"
  ON public.portfolio_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = portfolio_items.photographer_id AND p.profile_id = auth.uid()
  ));

CREATE POLICY "admins manage portfolio_items"
  ON public.portfolio_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX portfolio_items_photographer_idx ON public.portfolio_items(photographer_id, position);

CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric,
  duration text,
  deliverables text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages viewable by everyone"
  ON public.packages FOR SELECT USING (true);

CREATE POLICY "owners insert own packages"
  ON public.packages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = packages.photographer_id AND p.profile_id = auth.uid()
  ));

CREATE POLICY "owners update own packages"
  ON public.packages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = packages.photographer_id AND p.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = packages.photographer_id AND p.profile_id = auth.uid()
  ));

CREATE POLICY "owners delete own packages"
  ON public.packages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.photographers p
    WHERE p.id = packages.photographer_id AND p.profile_id = auth.uid()
  ));

CREATE POLICY "admins manage packages"
  ON public.packages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX packages_photographer_idx ON public.packages(photographer_id);
