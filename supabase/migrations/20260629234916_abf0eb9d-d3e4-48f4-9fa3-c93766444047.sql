
-- Add per-carousel metadata
ALTER TABLE public.site_carousels
  ADD COLUMN IF NOT EXISTS media_kind text NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS aspect text NOT NULL DEFAULT '16/9',
  ADD COLUMN IF NOT EXISTS show_title boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_source boolean NOT NULL DEFAULT true;

-- Reset positions and metadata for the 7 carousels
UPDATE public.site_carousels SET position = 0, media_kind='video', aspect='16/9', show_title=true,  show_source=true,  label='Bandeau page d''accueil' WHERE key='hero';
UPDATE public.site_carousels SET position = 3, media_kind='video', aspect='16/9', show_title=true,  show_source=true,  label='Nos réalisations — Ligne 1' WHERE key='realisations_1';
UPDATE public.site_carousels SET position = 4, media_kind='video', aspect='16/9', show_title=true,  show_source=true,  label='Nos réalisations — Ligne 2' WHERE key='realisations_2';
UPDATE public.site_carousels SET position = 5, media_kind='video', aspect='16/9', show_title=true,  show_source=true,  label='Nos réalisations — Ligne 3' WHERE key='realisations_3';

INSERT INTO public.site_carousels (key, label, description, position, media_kind, aspect, show_title, show_source) VALUES
  ('avis_video', 'Avis clients vidéo', 'Témoignages vidéo dans la section avis (format carré).', 1, 'video', '1/1', false, false),
  ('methode', 'Miniatures méthode', 'Miniatures animées dans la bannière « Notre méthode en 3 étapes ».', 2, 'image', '16/9', false, false),
  ('ads_alexis', 'Ads Alexis', 'Carrousel Ads verticales (témoignage Alexis).', 6, 'video', '9/16', true, false)
ON CONFLICT (key) DO UPDATE SET
  label=EXCLUDED.label, description=EXCLUDED.description, position=EXCLUDED.position,
  media_kind=EXCLUDED.media_kind, aspect=EXCLUDED.aspect,
  show_title=EXCLUDED.show_title, show_source=EXCLUDED.show_source;

-- Seed pre-filled cases (only if the carousel has none)
WITH seed AS (
  SELECT * FROM (VALUES
    ('hero', 0, 'Lancement produit SaaS', 'YouTube'),
    ('hero', 1, 'Formation 6 figures', 'Formation'),
    ('hero', 2, 'Podcast Tech Weekly', 'Podcast'),
    ('hero', 3, 'Pub Shopify Q4', 'E-commerce'),
    ('hero', 4, 'Vlog voyage Bali', 'YouTube'),
    ('hero', 5, 'Masterclass copy', 'Formation'),
    ('hero', 6, 'Talk conférence', 'Conférence'),
    ('hero', 7, 'Réel viral 2M vues', 'Reels'),
    ('avis_video', 0, '', ''),
    ('avis_video', 1, '', ''),
    ('methode', 0, '', ''),
    ('methode', 1, '', ''),
    ('methode', 2, '', ''),
    ('methode', 3, '', ''),
    ('methode', 4, '', ''),
    ('realisations_1', 0, 'Lancement SaaS Q4', 'YouTube'),
    ('realisations_1', 1, 'Masterclass Mindset', 'Formation'),
    ('realisations_1', 2, 'Podcast Founders FR', 'Podcast'),
    ('realisations_1', 3, 'Pub Shopify Black Friday', 'E-commerce'),
    ('realisations_1', 4, 'Vlog Tokyo 2026', 'YouTube'),
    ('realisations_1', 5, 'Talk Web Summit', 'Conférence'),
    ('realisations_2', 0, 'Réel viral 3M vues', 'Reels'),
    ('realisations_2', 1, 'Documentaire entrepreneuriat', 'YouTube'),
    ('realisations_2', 2, 'Formation copywriting', 'Formation'),
    ('realisations_2', 3, 'Episode podcast tech', 'Podcast'),
    ('realisations_2', 4, 'Campagne D2C beauté', 'E-commerce'),
    ('realisations_2', 5, 'Aftermovie événement', 'Branding'),
    ('realisations_3', 0, 'Long-form interview', 'YouTube'),
    ('realisations_3', 1, 'Ads UGC fitness', 'E-commerce'),
    ('realisations_3', 2, 'Live replay coaching', 'Formation'),
    ('realisations_3', 3, 'Short YouTube 60s', 'Shorts'),
    ('realisations_3', 4, 'Trailer formation', 'Promo'),
    ('realisations_3', 5, 'Étude de cas client', 'B2B'),
    ('ads_alexis', 0, 'Hook scroll-stop', ''),
    ('ads_alexis', 1, 'Témoignage client', ''),
    ('ads_alexis', 2, 'Démo produit', '')
  ) AS t(carousel_key, position, title, source_url)
)
INSERT INTO public.site_videos (carousel_key, position, title, source_url, format, visible)
SELECT s.carousel_key, s.position, s.title, s.source_url, 'long', true
FROM seed s
WHERE NOT EXISTS (SELECT 1 FROM public.site_videos v WHERE v.carousel_key = s.carousel_key);
