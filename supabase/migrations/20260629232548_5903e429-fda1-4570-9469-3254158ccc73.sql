
CREATE POLICY "Public read site-videos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-videos');
