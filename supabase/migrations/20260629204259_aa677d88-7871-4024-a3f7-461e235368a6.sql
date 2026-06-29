CREATE OR REPLACE FUNCTION public.verify_admin(_username text, _password text)
 RETURNS TABLE(id uuid, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
    SELECT a.id, a.username
    FROM public.admins a
    WHERE a.username = _username
      AND a.password_hash = extensions.crypt(_password, a.password_hash);
END;
$function$;