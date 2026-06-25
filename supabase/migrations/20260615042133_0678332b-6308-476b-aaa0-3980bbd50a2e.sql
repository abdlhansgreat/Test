
-- 1. image_overrides table: admin-curated image per slot
CREATE TABLE IF NOT EXISTS public.image_overrides (
  slot_key text PRIMARY KEY,
  url text NOT NULL,
  thumb text,
  alt text,
  credit text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.image_overrides TO anon, authenticated;
GRANT ALL ON public.image_overrides TO service_role;

ALTER TABLE public.image_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "image_overrides public read"
  ON public.image_overrides FOR SELECT
  USING (true);

CREATE POLICY "image_overrides admin write"
  ON public.image_overrides FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER trg_image_overrides_updated_at
  BEFORE UPDATE ON public.image_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Rename demo studios with authentic Indian names + Indian bios + Indian covers
WITH renames AS (
  SELECT * FROM (VALUES
    ('aperture-and-co',     'Saat Phere Studios',  'Hindu and Sikh wedding storytellers based in Delhi NCR — candid mandap moments, baraat energy and timeless bridal portraits.',                       '1583394293214-28a4b9b41e7d'),
    ('storyframe-studios',  'Shaadi Stories',      'Mumbai-based Indian wedding film and photo studio. From haldi to vidaai, we tell your shaadi story with cinematic warmth.',                          '1597157639073-69284dc0fdaf'),
    ('lightleaks-bangalore','Lens & Lehenga',      'Bengaluru pre-wedding and engagement specialists. Saree silhouettes, banyan-tree light and the easy chemistry of South Indian couples.',           '1465495976277-4387d4b0b4c6'),
    ('jaipur-frames',       'Rang by Aanya',       'Rajasthani royal weddings shot across Jaipur, Udaipur and Jodhpur — palace mandaps, marwari rituals and jewel-toned bridal portraits.',             '1606216794074-735e91aa2c92'),
    ('goa-by-light',        'Phera Films',         'Goa destination weddings: beachside pheras, sangeet nights and luxury Indian celebrations along the Konkan coast.',                                  '1604017011826-d3b4c23f8914'),
    ('hyderabad-stories',   'Mandap Tales',        'Telugu and Marwari wedding photographers in Hyderabad. Specialists in temple weddings, pellikuthuru rituals and grand reception sets.',             '1519225421980-715cb0215aed'),
    ('candid-by-rhea',      'Tara Newborn Co.',    'Mumbai newborn and baby photography in soft Indian home light. Naamkaran, annaprashan and first-month portraits with handwoven props.',             '1519689680058-324335c77eba'),
    ('the-fashion-room',    'Saree & Studio',      'Delhi & Mumbai editorial fashion. Lehenga and saree campaigns, designer lookbooks and modern Indian model portraits.',                              '1490481651871-ab68de25d43d'),
    ('newleaf-newborn',     'Laddu Little Ones',   'Bengaluru newborn, baby and family portraits with a warm South Indian sensibility — soft palettes, real homes, real giggles.',                      '1544776527-68e63addedf7'),
    ('mango-studio',        'Sona Jewellery Studio','Pune-based product photography studio specialising in Indian jewellery — kundan, polki, temple gold and bridal sets shot for e-commerce and lookbooks.', '1591604466107-ec97de577aff'),
    ('skyway-aerials',      'Akash Aerials',       'Drone cinematography for Indian destination weddings — Udaipur palaces, Goa beach pheras and Rajasthan haveli aerials.',                            '1473968512647-3e447244af8f'),
    ('reel-house-india',    'Baraat & Beats Films','Indian wedding cinematography from Mumbai. Baraat, sangeet, pheras and a 4-minute film that makes your family cry.',                                '1583939003579-730e3918a45a'),
    ('moments-by-arnav',    'Kadhal Frames',       'Chennai-based Tamil and Telugu pre-wedding and couple shoots. Temple light, sari drapes and the quiet kind of love.',                               '1525253013412-55c1a69a5738'),
    ('rooted-portrait-co',  'Bagh Portrait Co.',   'Kolkata portrait studio shooting Bengali brides, classical dancers and editorial portraits with old-Calcutta charm.',                               '1488161628813-04466f872be2')
  ) AS t(slug, name, bio, photo)
)
UPDATE public.photographers p
SET business_name = r.name,
    bio = r.bio,
    cover_url = 'https://images.unsplash.com/photo-' || r.photo || '?w=1600&q=80&auto=format&fit=crop'
FROM renames r
WHERE p.slug = r.slug AND p.is_demo = true;

-- 3. Replace all demo portfolio items with Indian-themed photo pool per genre
DELETE FROM public.portfolio_items
WHERE photographer_id IN (SELECT id FROM public.photographers WHERE is_demo = true);

WITH photo_pool AS (
  SELECT * FROM (VALUES
    ('wedding',         ARRAY['1583394293214-28a4b9b41e7d','1597157639073-69284dc0fdaf','1606216794074-735e91aa2c92','1583939003579-730e3918a45a','1604017011826-d3b4c23f8914','1519225421980-715cb0215aed','1591604466107-ec97de577aff','1610208234762-46cd33d0c0c8']),
    ('pre-wedding',     ARRAY['1465495976277-4387d4b0b4c6','1525253013412-55c1a69a5738','1583939411023-14783179e581','1529636798458-92182e662485','1606216794074-735e91aa2c92','1502824932014-04a02b405f80','1583394293214-28a4b9b41e7d','1597157639073-69284dc0fdaf']),
    ('fashion',         ARRAY['1490481651871-ab68de25d43d','1502716119720-b23a93e5fe1b','1487412720507-e7ab37603c6f','1488161628813-04466f872be2','1483985988355-763728e1935b','1521146764736-56c929d59c83','1469334031218-e382a71b716b','1531746020798-e6953c6e8e04']),
    ('newborn',         ARRAY['1519689680058-324335c77eba','1544776527-68e63addedf7','1607215114718-1b27c8a7fb0d','1518562180175-34a163b1a9a6','1531123414780-f74242c2b052','1583939411023-14783179e581','1591604466107-ec97de577aff','1606216794074-735e91aa2c92']),
    ('product',         ARRAY['1591604466107-ec97de577aff','1604017011826-d3b4c23f8914','1505740420928-5e560c06d30e','1523275335684-37898b6baf30','1565299624946-b28f40a0ae38','1490481651871-ab68de25d43d','1483985988355-763728e1935b','1492691527719-9d1e07e534b4']),
    ('drone',           ARRAY['1473968512647-3e447244af8f','1508614589041-895b88991e3e','1502824932014-04a02b405f80','1606216794074-735e91aa2c92','1583939003579-730e3918a45a','1597157639073-69284dc0fdaf','1492684223066-81342ee5ff30','1519225421980-715cb0215aed']),
    ('cinematography',  ARRAY['1492691527719-9d1e07e534b4','1583939003579-730e3918a45a','1606216794074-735e91aa2c92','1597157639073-69284dc0fdaf','1500210600740-e2f421380c50','1525253013412-55c1a69a5738','1473968512647-3e447244af8f','1519225421980-715cb0215aed']),
    ('portrait',        ARRAY['1488161628813-04466f872be2','1490481651871-ab68de25d43d','1502716119720-b23a93e5fe1b','1487412720507-e7ab37603c6f','1521146764736-56c929d59c83','1531746020798-e6953c6e8e04','1469334031218-e382a71b716b','1518562180175-34a163b1a9a6'])
  ) AS t(genre, photos)
),
joined AS (
  SELECT p.id AS pid, pp.photos, generate_series(1, 8) AS pos
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
SELECT j.pid, 'link',
  'https://images.unsplash.com/photo-' || j.photos[j.pos] || '?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-' || j.photos[j.pos] || '?w=600&q=70&auto=format&fit=crop',
  j.pos - 1, true
FROM joined j;
