
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','featured')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  gateway text DEFAULT 'razorpay',
  gateway_ref text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_photographer ON public.subscriptions(photographer_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    public.owns_photographer(photographer_id) OR public.is_admin()
  );

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
