
CREATE TABLE public.site_presence (
  ip text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);
GRANT SELECT, INSERT, UPDATE ON public.site_presence TO anon, authenticated;
GRANT ALL ON public.site_presence TO service_role;
ALTER TABLE public.site_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_no_client_read" ON public.site_presence FOR SELECT TO anon, authenticated USING (false);
CREATE INDEX site_presence_last_seen_idx ON public.site_presence (last_seen_at DESC);
