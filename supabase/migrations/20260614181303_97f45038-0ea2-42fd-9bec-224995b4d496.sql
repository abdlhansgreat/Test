
-- Helper: does a photographers row belong to the current user?
CREATE OR REPLACE FUNCTION public.owns_photographer(_pid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photographers WHERE id = _pid AND profile_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.owns_photographer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_photographer(uuid) TO authenticated;

-- gigs
CREATE TABLE public.gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL,
  role text NOT NULL CHECK (role IN ('second_shooter','associate','cinematographer')),
  genre_id uuid REFERENCES public.genres(id),
  event_date date,
  city text,
  day_rate numeric,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gigs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gigs TO authenticated;
GRANT ALL ON public.gigs TO service_role;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gigs public read" ON public.gigs FOR SELECT USING (true);
CREATE POLICY "gigs poster insert" ON public.gigs FOR INSERT TO authenticated
  WITH CHECK (public.owns_photographer(posted_by));
CREATE POLICY "gigs poster update" ON public.gigs FOR UPDATE TO authenticated
  USING (public.owns_photographer(posted_by)) WITH CHECK (public.owns_photographer(posted_by));
CREATE POLICY "gigs poster delete" ON public.gigs FOR DELETE TO authenticated
  USING (public.owns_photographer(posted_by));
CREATE POLICY "gigs admin all" ON public.gigs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER gigs_updated_at BEFORE UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- gig_applications
CREATE TABLE public.gig_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  message text,
  quoted_rate numeric,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','shortlisted','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gig_id, applicant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gig_applications TO authenticated;
GRANT ALL ON public.gig_applications TO service_role;
ALTER TABLE public.gig_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications read parties" ON public.gig_applications FOR SELECT TO authenticated
  USING (
    public.owns_photographer(applicant_id)
    OR EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND public.owns_photographer(g.posted_by))
  );
CREATE POLICY "applications insert by applicant" ON public.gig_applications FOR INSERT TO authenticated
  WITH CHECK (public.owns_photographer(applicant_id));
CREATE POLICY "applications update parties" ON public.gig_applications FOR UPDATE TO authenticated
  USING (
    public.owns_photographer(applicant_id)
    OR EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND public.owns_photographer(g.posted_by))
  )
  WITH CHECK (
    public.owns_photographer(applicant_id)
    OR EXISTS (SELECT 1 FROM public.gigs g WHERE g.id = gig_id AND public.owns_photographer(g.posted_by))
  );
CREATE POLICY "applications admin all" ON public.gig_applications FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER gig_applications_updated_at BEFORE UPDATE ON public.gig_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid REFERENCES public.gigs(id) ON DELETE CASCADE,
  gig_application_id uuid REFERENCES public.gig_applications(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  template_type text,
  terms_json jsonb,
  copyright_terms text,
  usage_terms text,
  signed_by_a boolean NOT NULL DEFAULT false,
  signed_by_b boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts parties read" ON public.contracts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = contracts.gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    )
  );
CREATE POLICY "contracts parties insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    )
  );
CREATE POLICY "contracts parties update" ON public.contracts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = contracts.gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gigs g
      LEFT JOIN public.gig_applications a ON a.id = contracts.gig_application_id
      WHERE g.id = contracts.gig_id
        AND (public.owns_photographer(g.posted_by) OR public.owns_photographer(a.applicant_id))
    )
  );
CREATE POLICY "contracts admin all" ON public.contracts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bookings.gig_id
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gig_id uuid REFERENCES public.gigs(id) ON DELETE SET NULL;
