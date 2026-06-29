
ALTER TABLE public.site_videos ADD COLUMN IF NOT EXISTS source_label text NOT NULL DEFAULT '';

-- Move existing textual values that aren't real URLs from source_url into source_label.
UPDATE public.site_videos
SET source_label = source_url,
    source_url = ''
WHERE source_url <> ''
  AND source_url NOT LIKE 'http%'
  AND source_label = '';
