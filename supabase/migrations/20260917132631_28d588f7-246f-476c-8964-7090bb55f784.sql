CREATE TABLE public.client_auth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('setup','reset','grant')),
  token_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_auth_tokens_lookup_idx ON public.client_auth_tokens (token_hash);
CREATE INDEX client_auth_tokens_email_idx ON public.client_auth_tokens (email, kind);

GRANT ALL ON public.client_auth_tokens TO service_role;

ALTER TABLE public.client_auth_tokens ENABLE ROW LEVEL SECURITY;