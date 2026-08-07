ALTER TABLE public.video_versions
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS additional_links jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status_override boolean NOT NULL DEFAULT false;

ALTER TABLE public.video_comments
  ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL DEFAULT '',
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS comment_reactions_unique_author
  ON public.comment_reactions (comment_id, author_id);

GRANT ALL ON public.comment_reactions TO service_role;

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comment_reactions_deny_all ON public.comment_reactions;
CREATE POLICY comment_reactions_deny_all ON public.comment_reactions
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

ALTER TABLE public.comment_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.video_comments REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;