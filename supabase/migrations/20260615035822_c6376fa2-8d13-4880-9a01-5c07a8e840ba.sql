
-- 1. Add cover_url + is_demo to photographers
ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_photographers_is_demo ON public.photographers(is_demo);

-- Ensure baseline genres exist (id stable via slug uniqueness)
INSERT INTO public.genres (name, slug) VALUES
  ('Wedding','wedding'),('Pre-wedding','pre-wedding'),('Fashion','fashion'),
  ('Newborn','newborn'),('Maternity','maternity'),('Product','product'),
  ('Cinematography','cinematography'),('Drone','drone'),('Events','events'),
  ('Portrait','portrait'),('Food','food')
ON CONFLICT (slug) DO NOTHING;

-- Ensure baseline cities exist
INSERT INTO public.cities (name, slug, popular) VALUES
  ('Delhi NCR','delhi-ncr',true),('Mumbai','mumbai',true),('Bengaluru','bengaluru',true),
  ('Jaipur','jaipur',true),('Goa','goa',true),('Hyderabad','hyderabad',true),
  ('Chennai','chennai',true),('Pune','pune',true),('Kolkata','kolkata',true),
  ('Ahmedabad','ahmedabad',true),('Chandigarh','chandigarh',false),('Udaipur','udaipur',false)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create a demo auth user (one user owns all demo photographers)
DO $$
DECLARE
  demo_uid uuid := '00000000-0000-4000-a000-000000000d10';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo_uid) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      demo_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'demo-seed@photolancer.local', crypt('demo-not-used-' || gen_random_uuid()::text, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PhotoLancer Demo","role":"photographer"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  END IF;

  -- Ensure profile exists (in case trigger didn't fire)
  INSERT INTO public.profiles (id, role, full_name)
    VALUES (demo_uid, 'photographer'::user_role, 'PhotoLancer Demo')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 3. Seed demo photographers
WITH demo AS (
  SELECT * FROM (VALUES
    ('aperture-and-co',     'Aperture & Co.',         'Delhi NCR', ARRAY['Delhi NCR','Gurugram','Noida'], 65000, 4.9, 47, true,  'wedding',         '1519741497674-611481863552'),
    ('storyframe-studios',  'Storyframe Studios',     'Mumbai',    ARRAY['Mumbai','Pune'],                85000, 4.8, 62, true,  'wedding',         '1583939003579-730e3918a45a'),
    ('lightleaks-bangalore','Lightleaks Bangalore',   'Bengaluru', ARRAY['Bengaluru','Mysuru'],           45000, 4.7, 38, true,  'pre-wedding',     '1525253013412-55c1a69a5738'),
    ('jaipur-frames',       'Jaipur Frames',          'Jaipur',    ARRAY['Jaipur','Udaipur','Jodhpur'],   55000, 4.9, 71, true,  'wedding',         '1606216794074-735e91aa2c92'),
    ('goa-by-light',        'Goa by Light',           'Goa',       ARRAY['Goa','Mumbai'],                 70000, 4.8, 29, true,  'wedding',         '1502824932014-04a02b405f80'),
    ('hyderabad-stories',   'Hyderabad Stories',      'Hyderabad', ARRAY['Hyderabad','Bengaluru'],        38000, 4.6, 22, false, 'wedding',         '1597157639073-69284dc0fdaf'),
    ('candid-by-rhea',      'Candid by Rhea',         'Mumbai',    ARRAY['Mumbai'],                       28000, 4.8, 54, true,  'newborn',         '1519689680058-324335c77eba'),
    ('the-fashion-room',    'The Fashion Room',       'Delhi NCR', ARRAY['Delhi NCR','Mumbai'],           95000, 4.9, 41, true,  'fashion',         '1490481651871-ab68de25d43d'),
    ('newleaf-newborn',     'NewLeaf Newborn',        'Bengaluru', ARRAY['Bengaluru','Chennai'],          18000, 4.9, 88, true,  'newborn',         '1544776527-68e63addedf7'),
    ('mango-studio',        'Mango Studio',           'Pune',      ARRAY['Pune','Mumbai'],                32000, 4.6, 19, false, 'product',         '1542291026-7eec264c27ff'),
    ('skyway-aerials',      'Skyway Aerials',         'Goa',       ARRAY['Goa','Mumbai','Jaipur'],        42000, 4.7, 26, true,  'drone',           '1473968512647-3e447244af8f'),
    ('reel-house-india',    'Reel House India',       'Mumbai',    ARRAY['Mumbai','Delhi NCR'],          120000, 4.8, 33, true,  'cinematography',  '1492691527719-9d1e07e534b4'),
    ('moments-by-arnav',    'Moments by Arnav',       'Chennai',   ARRAY['Chennai','Bengaluru'],          26000, 4.7, 44, false, 'pre-wedding',     '1465495976277-4387d4b0b4c6'),
    ('rooted-portrait-co',  'Rooted Portrait Co.',    'Kolkata',   ARRAY['Kolkata'],                      22000, 4.8, 31, true,  'portrait',        '1488161628813-04466f872be2')
  ) AS t(slug, name, city, scities, price, rating, reviews, verified, genre, photo)
)
INSERT INTO public.photographers (
  profile_id, slug, business_name, base_city, service_cities, starting_price,
  rating_avg, review_count, verified, available_for_second_shoots,
  response_time_hours, kind, years_experience, bio, cover_url,
  is_demo, is_published, claimed, invite_status
)
SELECT
  '00000000-0000-4000-a000-000000000d10'::uuid,
  d.slug, d.name, d.city, d.scities, d.price,
  d.rating, d.reviews, d.verified, true,
  2, 'studio'::photographer_kind, 6,
  'Award-winning ' || d.genre || ' photographers based in ' || d.city || ', shooting across India. We blend candid storytelling with timeless portraits — every shoot is treated like our own.',
  'https://images.unsplash.com/photo-' || d.photo || '?w=1600&q=80&auto=format&fit=crop',
  true, true, true, 'claimed'
FROM demo d
ON CONFLICT (slug) DO UPDATE SET
  cover_url = EXCLUDED.cover_url,
  is_demo = true,
  is_published = true;

-- Link demo photographers to a primary genre
INSERT INTO public.photographer_genres (photographer_id, genre_id)
SELECT p.id, g.id
FROM public.photographers p
JOIN (VALUES
  ('aperture-and-co','wedding'),('storyframe-studios','wedding'),('lightleaks-bangalore','pre-wedding'),
  ('jaipur-frames','wedding'),('goa-by-light','wedding'),('hyderabad-stories','wedding'),
  ('candid-by-rhea','newborn'),('the-fashion-room','fashion'),('newleaf-newborn','newborn'),
  ('mango-studio','product'),('skyway-aerials','drone'),('reel-house-india','cinematography'),
  ('moments-by-arnav','pre-wedding'),('rooted-portrait-co','portrait')
) AS m(pslug, gslug) ON m.pslug = p.slug
JOIN public.genres g ON g.slug = m.gslug
WHERE p.is_demo = true
ON CONFLICT DO NOTHING;

-- 4. Seed portfolio items (8 per photographer) using curated Unsplash photos by genre
WITH photo_pool AS (
  SELECT * FROM (VALUES
    ('wedding',         ARRAY['1519741497674-611481863552','1583939003579-730e3918a45a','1606216794074-735e91aa2c92','1591604466107-ec97de577aff','1604017011826-d3b4c23f8914','1597157639073-69284dc0fdaf','1519225421980-715cb0215aed','1511795409834-ef04bbd61622']),
    ('pre-wedding',     ARRAY['1525253013412-55c1a69a5738','1465495976277-4387d4b0b4c6','1529636798458-92182e662485','1583939411023-14783179e581','1502824932014-04a02b405f80','1511795409834-ef04bbd61622','1519225421980-715cb0215aed','1606216794074-735e91aa2c92']),
    ('fashion',         ARRAY['1490481651871-ab68de25d43d','1483985988355-763728e1935b','1469334031218-e382a71b716b','1502716119720-b23a93e5fe1b','1487412720507-e7ab37603c6f','1488161628813-04466f872be2','1521146764736-56c929d59c83','1531746020798-e6953c6e8e04']),
    ('newborn',         ARRAY['1519689680058-324335c77eba','1544776527-68e63addedf7','1607215114718-1b27c8a7fb0d','1518562180175-34a163b1a9a6','1531123414780-f74242c2b052','1519741497674-611481863552','1583939411023-14783179e581','1591604466107-ec97de577aff']),
    ('product',         ARRAY['1542291026-7eec264c27ff','1505740420928-5e560c06d30e','1523275335684-37898b6baf30','1565299624946-b28f40a0ae38','1504674900247-0877df9cc836','1483985988355-763728e1935b','1490481651871-ab68de25d43d','1492691527719-9d1e07e534b4']),
    ('drone',           ARRAY['1473968512647-3e447244af8f','1508614589041-895b88991e3e','1502824932014-04a02b405f80','1492684223066-81342ee5ff30','1525253013412-55c1a69a5738','1606216794074-735e91aa2c92','1519741497674-611481863552','1583939003579-730e3918a45a']),
    ('cinematography',  ARRAY['1492691527719-9d1e07e534b4','1500210600740-e2f421380c50','1492684223066-81342ee5ff30','1583939003579-730e3918a45a','1606216794074-735e91aa2c92','1519225421980-715cb0215aed','1525253013412-55c1a69a5738','1473968512647-3e447244af8f']),
    ('portrait',        ARRAY['1488161628813-04466f872be2','1531746020798-e6953c6e8e04','1521146764736-56c929d59c83','1469334031218-e382a71b716b','1502716119720-b23a93e5fe1b','1487412720507-e7ab37603c6f','1490481651871-ab68de25d43d','1518562180175-34a163b1a9a6'])
  ) AS t(genre, photos)
),
joined AS (
  SELECT
    p.id AS pid,
    pp.photos,
    generate_series(1, 8) AS pos
  FROM public.photographers p
  JOIN (VALUES
    ('aperture-and-co','wedding'),('storyframe-studios','wedding'),('lightleaks-bangalore','pre-wedding'),
    ('jaipur-frames','wedding'),('goa-by-light','wedding'),('hyderabad-stories','wedding'),
    ('candid-by-rhea','newborn'),('the-fashion-room','fashion'),('newleaf-newborn','newborn'),
    ('mango-studio','product'),('skyway-aerials','drone'),('reel-house-india','cinematography'),
    ('moments-by-arnav','pre-wedding'),('rooted-portrait-co','portrait')
  ) AS m(pslug, gslug) ON m.pslug = p.slug
  JOIN photo_pool pp ON pp.genre = m.gslug
  WHERE p.is_demo = true
)
INSERT INTO public.portfolio_items (photographer_id, source, media_url, thumbnail_url, position, verified)
SELECT
  j.pid, 'link',
  'https://images.unsplash.com/photo-' || j.photos[j.pos] || '?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-' || j.photos[j.pos] || '?w=600&q=70&auto=format&fit=crop',
  j.pos - 1, true
FROM joined j
WHERE NOT EXISTS (
  SELECT 1 FROM public.portfolio_items pi
  WHERE pi.photographer_id = j.pid AND pi.position = j.pos - 1
);

-- 5. Seed packages (3 per demo photographer)
INSERT INTO public.packages (photographer_id, title, description, duration, price, deliverables)
SELECT p.id, t.title, t.description, t.duration, p.starting_price * t.mult, t.deliverables
FROM public.photographers p
CROSS JOIN (VALUES
  ('Half-day shoot',  'Up to 4 hours of coverage with one photographer.',         '4 hours', 1.0, ARRAY['~150 edited photos','Online gallery','Personal license']),
  ('Full-day shoot',  'Full day of coverage with one or two photographers.',      '8 hours', 1.8, ARRAY['~400 edited photos','Online gallery','Highlight reel','Personal license']),
  ('Signature package','Pre-shoot consultation, two photographers and an album.', '10 hours', 2.6, ARRAY['~600 edited photos','Premium album','Highlight film','Drone footage','Personal license'])
) AS t(title, description, duration, mult, deliverables)
WHERE p.is_demo = true
  AND NOT EXISTS (SELECT 1 FROM public.packages pk WHERE pk.photographer_id = p.id);
