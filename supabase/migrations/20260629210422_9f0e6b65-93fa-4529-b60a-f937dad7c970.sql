
CREATE TABLE public.admin_remembered_ips (
  ip TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_remembered_ips TO service_role;
ALTER TABLE public.admin_remembered_ips ENABLE ROW LEVEL SECURITY;
