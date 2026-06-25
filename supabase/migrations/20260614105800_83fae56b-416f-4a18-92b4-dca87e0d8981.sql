
-- Enums
CREATE TYPE public.user_role AS ENUM ('customer','photographer','admin');
CREATE TYPE public.photographer_kind AS ENUM ('freelancer','studio','both');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'customer',
  full_name text,
  avatar_url text,
  phone text,
  city text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- is_admin helper (security definer; avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

CREATE POLICY "profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admins manage profiles"
  ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer'),
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Photographers
CREATE TABLE public.photographers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  business_name text NOT NULL,
  kind public.photographer_kind NOT NULL DEFAULT 'freelancer',
  base_city text,
  service_cities text[],
  starting_price numeric,
  day_rate numeric,
  currency text DEFAULT 'INR',
  available_for_second_shoots boolean DEFAULT false,
  response_time_hours int,
  years_experience int,
  team_size int,
  languages text[],
  equipment text[],
  bio text,
  instagram_handle text,
  instagram_connected boolean DEFAULT false,
  verified boolean DEFAULT false,
  verification_source text,
  featured boolean DEFAULT false,
  featured_until timestamptz,
  rating_avg numeric DEFAULT 0,
  review_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.photographers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photographers TO authenticated;
GRANT ALL ON public.photographers TO service_role;
ALTER TABLE public.photographers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photographers viewable by everyone"
  ON public.photographers FOR SELECT USING (true);
CREATE POLICY "owners insert own photographer"
  ON public.photographers FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "owners update own photographer"
  ON public.photographers FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "owners delete own photographer"
  ON public.photographers FOR DELETE USING (profile_id = auth.uid());
CREATE POLICY "admins manage photographers"
  ON public.photographers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Genres
CREATE TABLE public.genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL
);
GRANT SELECT ON public.genres TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.genres TO authenticated;
GRANT ALL ON public.genres TO service_role;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "genres viewable by everyone"
  ON public.genres FOR SELECT USING (true);
CREATE POLICY "admins manage genres"
  ON public.genres FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.genres (name, slug) VALUES
  ('Wedding','wedding'),
  ('Pre-wedding','pre-wedding'),
  ('Fashion','fashion'),
  ('Newborn','newborn'),
  ('Maternity','maternity'),
  ('Product','product'),
  ('Cinematography','cinematography'),
  ('Drone','drone'),
  ('Events','events');

-- Join table
CREATE TABLE public.photographer_genres (
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (photographer_id, genre_id)
);
GRANT SELECT ON public.photographer_genres TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photographer_genres TO authenticated;
GRANT ALL ON public.photographer_genres TO service_role;
ALTER TABLE public.photographer_genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photographer_genres viewable by everyone"
  ON public.photographer_genres FOR SELECT USING (true);
CREATE POLICY "owners insert own photographer_genres"
  ON public.photographer_genres FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.photographers p
            WHERE p.id = photographer_id AND p.profile_id = auth.uid())
  );
CREATE POLICY "owners delete own photographer_genres"
  ON public.photographer_genres FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.photographers p
            WHERE p.id = photographer_id AND p.profile_id = auth.uid())
  );
CREATE POLICY "admins manage photographer_genres"
  ON public.photographer_genres FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Storage policies: per-user folder uploads to avatars + portfolio
CREATE POLICY "avatars are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "users upload to own avatars folder"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "users update own avatars"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "users delete own avatars"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolio is publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "users upload to own portfolio folder"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "users update own portfolio"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "users delete own portfolio"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]
  );
