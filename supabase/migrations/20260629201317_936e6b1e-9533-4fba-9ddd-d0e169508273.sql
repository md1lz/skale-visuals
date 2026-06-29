
CREATE OR REPLACE FUNCTION public.verify_admin(_username TEXT, _password TEXT)
RETURNS TABLE(id UUID, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT a.id, a.username
    FROM public.admins a
    WHERE a.username = _username
      AND a.password_hash = crypt(_password, a.password_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin(TEXT, TEXT) TO service_role;
