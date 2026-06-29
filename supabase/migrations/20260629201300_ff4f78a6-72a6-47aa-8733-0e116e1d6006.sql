
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

GRANT ALL ON public.admins TO service_role;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- No policies: blocks anon/authenticated entirely. Only service_role bypasses RLS.

INSERT INTO public.admins (username, password_hash) VALUES
  ('didiolorenzo', crypt('V7qM-92xL-K4pZ', gen_salt('bf', 12))),
  ('harroismadi',  crypt('R8tN-5Qw3-X9mK', gen_salt('bf', 12)));

CREATE TABLE public.admin_login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_login_events TO service_role;
ALTER TABLE public.admin_login_events ENABLE ROW LEVEL SECURITY;
