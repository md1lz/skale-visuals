ALTER TABLE public.project_videos DROP CONSTRAINT project_videos_script_status_check;
ALTER TABLE public.project_videos ALTER COLUMN script_status SET DEFAULT 'none';
UPDATE public.project_videos SET script_status = 'none' WHERE script_status NOT IN ('none','pending','modified','validated');
ALTER TABLE public.project_videos ADD CONSTRAINT project_videos_script_status_check CHECK (script_status = ANY (ARRAY['none'::text,'pending'::text,'modified'::text,'validated'::text]));