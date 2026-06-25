-- INQUIRIES
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  event_type text,
  event_date date,
  city text,
  budget numeric,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','accepted','declined','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inquiries select own" ON public.inquiries FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
);
CREATE POLICY "inquiries insert by customer" ON public.inquiries FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());
CREATE POLICY "inquiries update by photographer or customer" ON public.inquiries FOR UPDATE TO authenticated
USING (
  customer_id = auth.uid()
  OR photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
)
WITH CHECK (
  customer_id = auth.uid()
  OR photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
);
CREATE POLICY "inquiries admin all" ON public.inquiries USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX inquiries_customer_idx ON public.inquiries(customer_id);
CREATE INDEX inquiries_photographer_idx ON public.inquiries(photographer_id);
CREATE TRIGGER inquiries_set_updated_at BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- QUOTES
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes select own" ON public.quotes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id = inquiry_id AND (
      i.customer_id = auth.uid()
      OR i.photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
    )
  )
);
CREATE POLICY "quotes insert by photographer" ON public.quotes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id = inquiry_id
      AND i.photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
  )
);
CREATE POLICY "quotes update by photographer or customer" ON public.quotes FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id = inquiry_id AND (
      i.customer_id = auth.uid()
      OR i.photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inquiries i
    WHERE i.id = inquiry_id AND (
      i.customer_id = auth.uid()
      OR i.photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
    )
  )
);
CREATE POLICY "quotes admin all" ON public.quotes USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX quotes_inquiry_idx ON public.quotes(inquiry_id);
CREATE TRIGGER quotes_set_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BOOKINGS
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES public.inquiries(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  photographer_id uuid REFERENCES public.photographers(id) ON DELETE SET NULL,
  event_date date,
  amount numeric,
  commission_amount numeric,
  escrow_status text NOT NULL DEFAULT 'none' CHECK (escrow_status IN ('none','held','released','refunded')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings select own" ON public.bookings FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
);
CREATE POLICY "bookings insert by customer" ON public.bookings FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());
CREATE POLICY "bookings update by parties" ON public.bookings FOR UPDATE TO authenticated
USING (
  customer_id = auth.uid()
  OR photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
)
WITH CHECK (
  customer_id = auth.uid()
  OR photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
);
CREATE POLICY "bookings admin all" ON public.bookings USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX bookings_customer_idx ON public.bookings(customer_id);
CREATE INDEX bookings_photographer_idx ON public.bookings(photographer_id);
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount numeric,
  commission_amount numeric,
  gateway text DEFAULT 'razorpay',
  gateway_ref text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','refunded')),
  payout_status text NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments select own" ON public.payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id AND (
      b.customer_id = auth.uid()
      OR b.photographer_id IN (SELECT id FROM public.photographers WHERE profile_id = auth.uid())
    )
  )
);
CREATE POLICY "payments admin all" ON public.payments USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX payments_booking_idx ON public.payments(booking_id);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();