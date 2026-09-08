DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings home read" ON public.site_settings;
CREATE POLICY "site_settings public content read"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('home', 'about', 'compare'));