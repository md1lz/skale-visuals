
CREATE TABLE public.site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('page_view','cta_click','session_start','session_heartbeat','tally_submitted')),
  session_id text NOT NULL,
  path text,
  cta_id text,
  referrer text,
  source text,
  user_agent text,
  device text CHECK (device IN ('mobile','desktop','tablet','unknown')),
  country text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.site_events TO anon, authenticated;
GRANT ALL ON public.site_events TO service_role;

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert site events"
  ON public.site_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX site_events_created_at_idx ON public.site_events (created_at DESC);
CREATE INDEX site_events_type_created_idx ON public.site_events (type, created_at DESC);
CREATE INDEX site_events_session_idx ON public.site_events (session_id, created_at);
