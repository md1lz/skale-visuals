-- 1. New global status value
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Montage terminé' BEFORE 'Livrée';

-- 2. project_videos
CREATE TABLE public.project_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  video_number integer NOT NULL,
  status text NOT NULL DEFAULT 'À faire',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_videos_status_check CHECK (status IN ('À faire','En cours','En révision','Approuvée','Corrections à faire')),
  CONSTRAINT project_videos_unique UNIQUE (project_id, video_number)
);
GRANT ALL ON public.project_videos TO service_role;
ALTER TABLE public.project_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_videos_deny_all ON public.project_videos AS RESTRICTIVE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER project_videos_touch BEFORE UPDATE ON public.project_videos FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();
CREATE INDEX project_videos_project_idx ON public.project_videos(project_id);

-- 3. video_versions
CREATE TABLE public.video_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_video_id uuid NOT NULL REFERENCES public.project_videos(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES public.editor_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.video_versions TO service_role;
ALTER TABLE public.video_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_versions_deny_all ON public.video_versions AS RESTRICTIVE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX video_versions_video_idx ON public.video_versions(project_video_id);

-- 4. video_comments
CREATE TABLE public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_video_id uuid NOT NULL REFERENCES public.project_videos(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('admin','editor')),
  author_id text,
  author_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  read_by_editor boolean NOT NULL DEFAULT false,
  read_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.video_comments TO service_role;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_comments_deny_all ON public.video_comments AS RESTRICTIVE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX video_comments_video_idx ON public.video_comments(project_video_id);

-- 5. Auto-create videos from projects.editor_quantity
CREATE OR REPLACE FUNCTION public.sync_project_videos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _qty int;
BEGIN
  _qty := LEAST(GREATEST(COALESCE(NEW.editor_quantity, 0)::int, 0), 200);
  IF _qty > 0 THEN
    INSERT INTO public.project_videos (project_id, video_number)
    SELECT NEW.id, g FROM generate_series(1, _qty) g
    ON CONFLICT (project_id, video_number) DO NOTHING;
  END IF;
  DELETE FROM public.project_videos WHERE project_id = NEW.id AND video_number > _qty;
  RETURN NEW;
END $$;

CREATE TRIGGER projects_sync_videos_ins AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.sync_project_videos();

CREATE TRIGGER projects_sync_videos_upd AFTER UPDATE OF editor_quantity ON public.projects
FOR EACH ROW WHEN (NEW.editor_quantity IS DISTINCT FROM OLD.editor_quantity)
EXECUTE FUNCTION public.sync_project_videos();

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;