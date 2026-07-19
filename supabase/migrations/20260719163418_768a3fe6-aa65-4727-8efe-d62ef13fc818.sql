
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings public read" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.site_settings (key, value) VALUES
  ('maintenance', '{"enabled": false, "message": "Nous effectuons actuellement une maintenance. Merci de revenir un peu plus tard."}'::jsonb)
ON CONFLICT (key) DO NOTHING;
