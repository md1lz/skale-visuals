CREATE TABLE public.editor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editor_accounts_status_chk CHECK (status IN ('active','suspended'))
);
GRANT ALL ON public.editor_accounts TO service_role;
ALTER TABLE public.editor_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editor_accounts_deny_all" ON public.editor_accounts AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER editor_accounts_touch BEFORE UPDATE ON public.editor_accounts FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

ALTER TABLE public.projects ADD COLUMN editor_id uuid REFERENCES public.editor_accounts(id) ON DELETE SET NULL;
CREATE INDEX projects_editor_id_idx ON public.projects(editor_id);

CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.editor_accounts(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  version_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.project_files TO service_role;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_files_deny_all" ON public.project_files AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX project_files_project_idx ON public.project_files(project_id);

CREATE TABLE public.project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_id text,
  author_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_comments_author_type_chk CHECK (author_type IN ('admin','editor'))
);
GRANT ALL ON public.project_comments TO service_role;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_comments_deny_all" ON public.project_comments AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX project_comments_project_idx ON public.project_comments(project_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type text NOT NULL,
  recipient_id text,
  type text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_recipient_type_chk CHECK (recipient_type IN ('admin','editor'))
);
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_deny_all" ON public.notifications AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX notifications_recipient_idx ON public.notifications(recipient_type, recipient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_editor(_display_name text, _username text, _password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.editor_accounts (display_name, username, password_hash)
  VALUES (_display_name, _username, extensions.crypt(_password, extensions.gen_salt('bf')))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_editor(text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_editor_password(_id uuid, _new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE _count int;
BEGIN
  UPDATE public.editor_accounts
    SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf'))
    WHERE id = _id;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.set_editor_password(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_editor(_username text, _password text)
RETURNS TABLE(id uuid, username text, display_name text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
BEGIN
  RETURN QUERY
    SELECT e.id, e.username, e.display_name, e.status
    FROM public.editor_accounts e
    WHERE e.username = _username
      AND e.password_hash = extensions.crypt(_password, e.password_hash);
END;
$$;
REVOKE ALL ON FUNCTION public.verify_editor(text, text) FROM PUBLIC, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;