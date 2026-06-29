
-- Carousels metadata (label, description, order)
CREATE TABLE public.site_carousels (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_carousels TO anon, authenticated;
GRANT ALL ON public.site_carousels TO service_role;
ALTER TABLE public.site_carousels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read carousels" ON public.site_carousels FOR SELECT TO anon, authenticated USING (true);

-- Videos
CREATE TABLE public.site_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_key text NOT NULL REFERENCES public.site_carousels(key) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  thumbnail_url text,
  format text NOT NULL DEFAULT 'long' CHECK (format IN ('court','long','miniature')),
  visible boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_videos TO anon, authenticated;
GRANT ALL ON public.site_videos TO service_role;
ALTER TABLE public.site_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visible videos" ON public.site_videos FOR SELECT TO anon, authenticated USING (visible = true);

CREATE INDEX site_videos_carousel_idx ON public.site_videos(carousel_key, position);

CREATE OR REPLACE FUNCTION public._touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER site_videos_touch BEFORE UPDATE ON public.site_videos FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
CREATE TRIGGER site_carousels_touch BEFORE UPDATE ON public.site_carousels FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

-- Seed carousels matching the public site
INSERT INTO public.site_carousels(key, label, description, position) VALUES
  ('hero', 'Bandeau page d''accueil', 'Le défilement de miniatures en haut du site, juste sous la baseline.', 0),
  ('realisations_1', 'Nos réalisations — Ligne 1', 'Première ligne du carrousel défilant gauche→droite dans la section Nos réalisations.', 1),
  ('realisations_2', 'Nos réalisations — Ligne 2', 'Deuxième ligne, défilement droite→gauche.', 2),
  ('realisations_3', 'Nos réalisations — Ligne 3', 'Troisième ligne, défilement gauche→droite.', 3);
