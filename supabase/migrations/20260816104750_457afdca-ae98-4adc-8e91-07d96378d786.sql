ALTER TABLE public.project_videos ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS project_comments_project_idx ON public.project_comments(project_id);

CREATE TABLE IF NOT EXISTS public.project_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL DEFAULT '',
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, author_id)
);
GRANT ALL ON public.project_comment_reactions TO service_role;
ALTER TABLE public.project_comment_reactions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_comment_reactions' AND policyname='project_comment_reactions_deny_all') THEN
    CREATE POLICY project_comment_reactions_deny_all ON public.project_comment_reactions
      AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.project_typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL DEFAULT '',
  is_recording_audio boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, author_type, author_id)
);
GRANT ALL ON public.project_typing_indicators TO service_role;
ALTER TABLE public.project_typing_indicators ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_typing_indicators' AND policyname='project_typing_indicators_deny_all') THEN
    CREATE POLICY project_typing_indicators_deny_all ON public.project_typing_indicators
      AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

ALTER TABLE public.project_comments REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;
  END IF;
END $$;