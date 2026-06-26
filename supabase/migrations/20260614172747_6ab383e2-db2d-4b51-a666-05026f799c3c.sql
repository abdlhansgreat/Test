CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, date)
);

GRANT SELECT ON public.availability TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability TO authenticated;
GRANT ALL ON public.availability TO service_role;

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability viewable by everyone" ON public.availability FOR SELECT USING (true);
CREATE POLICY "owners insert own availability" ON public.availability FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_id AND p.profile_id = auth.uid()));
CREATE POLICY "owners update own availability" ON public.availability FOR UPDATE USING (EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_id AND p.profile_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_id AND p.profile_id = auth.uid()));
CREATE POLICY "owners delete own availability" ON public.availability FOR DELETE USING (EXISTS (SELECT 1 FROM public.photographers p WHERE p.id = photographer_id AND p.profile_id = auth.uid()));
CREATE POLICY "admins manage availability" ON public.availability USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX availability_date_idx ON public.availability (date);
CREATE INDEX availability_photographer_idx ON public.availability (photographer_id);

CREATE TRIGGER availability_set_updated_at BEFORE UPDATE ON public.availability FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();