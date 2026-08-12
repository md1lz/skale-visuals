ALTER TABLE public.video_comments
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duration integer;

ALTER TABLE public.video_comments ALTER COLUMN content SET DEFAULT '';

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_video_id uuid NOT NULL REFERENCES public.project_videos(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_id text NOT NULL,
  author_name text NOT NULL DEFAULT '',
  is_recording_audio boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_video_id, author_type, author_id)
);

GRANT ALL ON public.typing_indicators TO service_role;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY typing_indicators_deny_all ON public.typing_indicators
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);