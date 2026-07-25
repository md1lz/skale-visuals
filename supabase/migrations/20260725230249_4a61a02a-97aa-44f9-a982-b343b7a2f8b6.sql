
CREATE TYPE public.project_format AS ENUM ('Court', 'Long');
CREATE TYPE public.project_status AS ENUM (
  'En attente de validation client',
  'À faire',
  'En cours',
  'En révision',
  'Corrections',
  'Livrée',
  'Payée'
);
CREATE TYPE public.editor_rate_type AS ENUM ('per_video', 'per_minute');

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  format public.project_format NOT NULL DEFAULT 'Court',
  status public.project_status NOT NULL DEFAULT 'En attente de validation client',
  editor_name text,
  editor_rate numeric(12,2),
  editor_rate_type public.editor_rate_type NOT NULL DEFAULT 'per_video',
  editor_quantity numeric(12,2),
  editor_total_cost numeric(12,2) NOT NULL DEFAULT 0,
  amount_invoiced_ht numeric(12,2) NOT NULL DEFAULT 0,
  gross_profit numeric(12,2) NOT NULL DEFAULT 0,
  social_charges numeric(12,2) NOT NULL DEFAULT 0,
  net_profit numeric(12,2) NOT NULL DEFAULT 0,
  deadline date,
  brief text,
  rushs_received boolean NOT NULL DEFAULT false,
  rushs_links text[] NOT NULL DEFAULT '{}',
  delivery_link text,
  revision_link text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_deadline_idx ON public.projects(deadline);
CREATE INDEX projects_status_idx ON public.projects(status);
CREATE INDEX projects_client_idx ON public.projects(client_id);

GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_deny_all" ON public.projects AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER projects_touch_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

CREATE TABLE public.project_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status public.project_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX psh_project_idx ON public.project_status_history(project_id, changed_at DESC);

GRANT ALL ON public.project_status_history TO service_role;
ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psh_deny_all" ON public.project_status_history AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public._project_log_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_status_history(project_id, status) VALUES (NEW.id, NEW.status);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.project_status_history(project_id, status) VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER project_status_history_trg
AFTER INSERT OR UPDATE OF status ON public.projects
FOR EACH ROW EXECUTE FUNCTION public._project_log_status_change();

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
