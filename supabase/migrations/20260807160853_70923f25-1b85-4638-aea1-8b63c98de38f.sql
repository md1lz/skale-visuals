ALTER TABLE public.editor_accounts DROP COLUMN IF EXISTS password_plain;

CREATE OR REPLACE FUNCTION public.create_editor(_display_name text, _username text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.editor_accounts (display_name, username, password_hash)
  VALUES (_display_name, _username, extensions.crypt(_password, extensions.gen_salt('bf')))
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_editor_password(_id uuid, _new_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE _count int;
BEGIN
  UPDATE public.editor_accounts
    SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf'))
    WHERE id = _id;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count > 0;
END;
$function$;