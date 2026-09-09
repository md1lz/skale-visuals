-- Initial admin accounts. The original plaintext passwords were removed from
-- the migration history after rotation. On a fresh replay, accounts are
-- created with a random unusable password; set a real one via
-- public.set_admin_password('<username>', '<new-password>') from a secure context.
INSERT INTO public.admins (username, password_hash)
VALUES
  ('didiolorenzo', extensions.crypt(encode(extensions.gen_random_bytes(32), 'hex'), extensions.gen_salt('bf'))),
  ('harroismadi', extensions.crypt(encode(extensions.gen_random_bytes(32), 'hex'), extensions.gen_salt('bf')))
ON CONFLICT DO NOTHING;
