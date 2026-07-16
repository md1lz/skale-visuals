
DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM ('Prospect','Actif','En pause','Terminé','Archivé');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_complet TEXT NOT NULL,
  entreprise TEXT,
  email TEXT,
  telephone TEXT,
  statut public.client_status NOT NULL DEFAULT 'Prospect',
  type_projet TEXT,
  budget NUMERIC(12,2),
  date_debut DATE,
  date_fin DATE,
  lien_drive TEXT,
  reseaux_sociaux TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.clients TO service_role;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: access is only through the admin session server functions using the service role.
CREATE POLICY "No direct client access" ON public.clients FOR SELECT USING (false);

CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

CREATE INDEX idx_clients_statut ON public.clients(statut);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);
