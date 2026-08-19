ALTER TABLE public.project_videos
  ADD COLUMN IF NOT EXISTS script_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS script_updated_at timestamptz;

ALTER TABLE public.project_videos DROP CONSTRAINT IF EXISTS project_videos_script_status_check;
ALTER TABLE public.project_videos
  ADD CONSTRAINT project_videos_script_status_check
  CHECK (script_status IN ('draft','pending','validated'));