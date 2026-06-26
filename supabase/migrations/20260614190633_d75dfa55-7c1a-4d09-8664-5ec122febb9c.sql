
-- 1) reviews.hidden
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Recompute trigger to ignore hidden reviews
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
    SET rating_avg = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.reviews WHERE photographer_id = _pid AND hidden = false), 0),
        review_count = (SELECT COUNT(*) FROM public.reviews WHERE photographer_id = _pid AND hidden = false)
    WHERE p.id = _pid;
  RETURN NULL;
END;
$$;

-- 2) platform_settings — single row
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_rate numeric NOT NULL DEFAULT 0.10,
  featured_price numeric NOT NULL DEFAULT 999,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

INSERT INTO public.platform_settings (commission_rate, featured_price)
  SELECT 0.10, 999
  WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 3) cities
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  state text,
  lat numeric,
  lng numeric,
  popular boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cities"
  ON public.cities FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert cities"
  ON public.cities FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update cities"
  ON public.cities FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete cities"
  ON public.cities FOR DELETE TO authenticated USING (public.is_admin());

INSERT INTO public.cities (name, slug, state, lat, lng, popular) VALUES
  ('Delhi NCR','delhi-ncr','Delhi',28.6139,77.2090,true),
  ('Mumbai','mumbai','Maharashtra',19.0760,72.8777,true),
  ('Bengaluru','bengaluru','Karnataka',12.9716,77.5946,true),
  ('Hyderabad','hyderabad','Telangana',17.3850,78.4867,true),
  ('Chennai','chennai','Tamil Nadu',13.0827,80.2707,true),
  ('Kolkata','kolkata','West Bengal',22.5726,88.3639,true),
  ('Pune','pune','Maharashtra',18.5204,73.8567,true),
  ('Jaipur','jaipur','Rajasthan',26.9124,75.7873,true),
  ('Ahmedabad','ahmedabad','Gujarat',23.0225,72.5714,true),
  ('Goa','goa','Goa',15.2993,74.1240,true),
  ('Chandigarh','chandigarh','Chandigarh',30.7333,76.7794,true),
  ('Lucknow','lucknow','Uttar Pradesh',26.8467,80.9462,true),
  ('Surat','surat','Gujarat',21.1702,72.8311,false),
  ('Indore','indore','Madhya Pradesh',22.7196,75.8577,false),
  ('Bhopal','bhopal','Madhya Pradesh',23.2599,77.4126,false),
  ('Kochi','kochi','Kerala',9.9312,76.2673,false),
  ('Thiruvananthapuram','thiruvananthapuram','Kerala',8.5241,76.9366,false),
  ('Coimbatore','coimbatore','Tamil Nadu',11.0168,76.9558,false),
  ('Visakhapatnam','visakhapatnam','Andhra Pradesh',17.6868,83.2185,false),
  ('Nagpur','nagpur','Maharashtra',21.1458,79.0882,false),
  ('Patna','patna','Bihar',25.5941,85.1376,false),
  ('Guwahati','guwahati','Assam',26.1445,91.7362,false),
  ('Dehradun','dehradun','Uttarakhand',30.3165,78.0322,false),
  ('Udaipur','udaipur','Rajasthan',24.5854,73.7125,false)
ON CONFLICT (slug) DO NOTHING;
