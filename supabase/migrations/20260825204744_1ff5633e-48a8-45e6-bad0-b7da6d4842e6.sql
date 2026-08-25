CREATE TABLE public.home_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_folders TO anon;
GRANT SELECT ON public.home_folders TO authenticated;
GRANT ALL ON public.home_folders TO service_role;
ALTER TABLE public.home_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_folders public read" ON public.home_folders FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.home_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.home_folders(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT 'Skale Visuals',
  source_url text NOT NULL DEFAULT '',
  thumbnail_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_videos TO anon;
GRANT SELECT ON public.home_videos TO authenticated;
GRANT ALL ON public.home_videos TO service_role;
ALTER TABLE public.home_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_videos public read" ON public.home_videos FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "site_settings home read" ON public.site_settings FOR SELECT TO anon, authenticated USING (key = 'home');
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;

ALTER TABLE public.home_folders REPLICA IDENTITY FULL;
ALTER TABLE public.home_videos REPLICA IDENTITY FULL;
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.home_folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.home_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

INSERT INTO public.home_folders (label, position) VALUES
  ('VSL', 0), ('Vlog', 1), ('YouTube', 2), ('Ads', 3), ('Shorts & Reels', 4), ('Motion Design', 5);