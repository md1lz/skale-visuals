ALTER TABLE public.project_comments
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duration integer,
  ADD COLUMN IF NOT EXISTS read_by_editor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_by_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;