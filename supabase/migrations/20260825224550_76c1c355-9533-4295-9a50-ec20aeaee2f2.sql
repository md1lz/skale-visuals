ALTER TABLE public.admin_remembered_ips
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS owner_id text;

ALTER TABLE public.admin_remembered_ips DROP CONSTRAINT IF EXISTS admin_remembered_ips_pkey;
ALTER TABLE public.admin_remembered_ips ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS admin_remembered_ips_unique_device
  ON public.admin_remembered_ips (ip, source, owner_type, username);