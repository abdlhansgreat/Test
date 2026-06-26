CREATE TABLE public.saved_photographers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, photographer_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_photographers TO authenticated;
GRANT ALL ON public.saved_photographers TO service_role;

ALTER TABLE public.saved_photographers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved select own" ON public.saved_photographers
  FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "saved insert own" ON public.saved_photographers
  FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "saved delete own" ON public.saved_photographers
  FOR DELETE TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "saved admin all" ON public.saved_photographers
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX saved_photographers_customer_idx ON public.saved_photographers(customer_id, created_at DESC);