CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'Instagram',
  profile_url text,
  email text,
  niche text,
  subscriber_count integer,
  status text NOT NULL DEFAULT 'À contacter',
  interested text NOT NULL DEFAULT 'En attente',
  first_contact_date date,
  last_contact_date date,
  next_followup_date date,
  notes text,
  converted_to_client boolean NOT NULL DEFAULT false,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prospects TO service_role;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct prospect access" ON public.prospects FOR SELECT USING (false);

CREATE TRIGGER trg_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

CREATE INDEX idx_prospects_next_followup ON public.prospects(next_followup_date);
CREATE INDEX idx_prospects_status ON public.prospects(status);

CREATE TABLE public.prospect_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  type text NOT NULL,
  note text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prospect_interactions TO service_role;
ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct prospect interaction access" ON public.prospect_interactions FOR SELECT USING (false);

CREATE INDEX idx_prospect_interactions_prospect ON public.prospect_interactions(prospect_id, date DESC);