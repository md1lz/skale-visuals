
CREATE OR REPLACE FUNCTION public.set_admin_password(_username text, _new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _count int;
BEGIN
  UPDATE public.admins
    SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf'))
    WHERE username = _username;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.rename_admin(_old_username text, _new_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count int;
BEGIN
  UPDATE public.admins SET username = _new_username WHERE username = _old_username;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin(_username text, _password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.admins (username, password_hash)
    VALUES (_username, extensions.crypt(_password, extensions.gen_salt('bf')))
    RETURNING id INTO _id;
  RETURN _id;
END;
$$;
