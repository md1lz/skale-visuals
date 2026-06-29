DROP POLICY IF EXISTS "Public read site-videos" ON storage.objects;

CREATE POLICY "Read visible site-videos only" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'site-videos'
  AND EXISTS (
    SELECT 1 FROM public.site_videos v
    WHERE v.visible = true
      AND (
        v.source_url = (SELECT 'https://jtggstccocjqlmwoiqjo.supabase.co/storage/v1/object/public/site-videos/' || storage.objects.name)
        OR v.source_url LIKE '%/site-videos/' || storage.objects.name
        OR v.thumbnail_url LIKE '%/site-videos/' || storage.objects.name
      )
  )
);