
-- Defense-in-depth: revoke ALL privileges from PostgREST-exposed roles on admin tables.
-- RLS is already enabled with no policies (deny-all), but explicit REVOKEs ensure
-- that even an accidental future SELECT/INSERT policy cannot leak data, because
-- the role itself lacks the underlying table privilege. Only service_role
-- (used by supabaseAdmin in server functions) retains access.

REVOKE ALL ON public.admins FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_login_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_remembered_ips FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.admins TO service_role;
GRANT ALL ON public.admin_login_events TO service_role;
GRANT ALL ON public.admin_remembered_ips TO service_role;
