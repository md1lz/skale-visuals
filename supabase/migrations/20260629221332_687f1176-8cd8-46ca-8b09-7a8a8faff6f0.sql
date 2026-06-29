
REVOKE ALL ON FUNCTION public.set_admin_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rename_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_admin(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rename_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin(text, text) TO service_role;
