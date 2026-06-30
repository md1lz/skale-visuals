CREATE TABLE public.admin_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  message text NOT NULL,
  actor_username text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_activity TO service_role;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_activity_no_client_access" ON public.admin_activity FOR SELECT USING (false);
CREATE INDEX admin_activity_created_at_idx ON public.admin_activity (created_at DESC);