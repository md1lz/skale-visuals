
-- Explicitly deny anon/authenticated access to sensitive admin/analytics tables.
-- These tables are meant to be accessed only via SECURITY DEFINER functions or the service role.
-- Adding explicit restrictive policies documents intent and makes fail-closed behavior visible.

-- admins
REVOKE ALL ON public.admins FROM anon, authenticated;
CREATE POLICY "Deny all access to anon" ON public.admins AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny all access to authenticated" ON public.admins AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- admin_login_events
REVOKE ALL ON public.admin_login_events FROM anon, authenticated;
CREATE POLICY "Deny all access to anon" ON public.admin_login_events AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny all access to authenticated" ON public.admin_login_events AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- admin_remembered_ips
REVOKE ALL ON public.admin_remembered_ips FROM anon, authenticated;
CREATE POLICY "Deny all access to anon" ON public.admin_remembered_ips AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny all access to authenticated" ON public.admin_remembered_ips AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- site_events: keep INSERT (tracking) from anon/authenticated, but explicitly deny SELECT/UPDATE/DELETE.
CREATE POLICY "Deny select to anon" ON public.site_events AS RESTRICTIVE FOR SELECT TO anon USING (false);
CREATE POLICY "Deny select to authenticated" ON public.site_events AS RESTRICTIVE FOR SELECT TO authenticated USING (false);
CREATE POLICY "Deny update to anon" ON public.site_events AS RESTRICTIVE FOR UPDATE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny update to authenticated" ON public.site_events AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny delete to anon" ON public.site_events AS RESTRICTIVE FOR DELETE TO anon USING (false);
CREATE POLICY "Deny delete to authenticated" ON public.site_events AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
