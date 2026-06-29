
-- Revoke EXECUTE on SECURITY DEFINER admin functions from anon/authenticated.
-- These are called from server functions using the service_role key only.
REVOKE EXECUTE ON FUNCTION public.verify_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_admin(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_admin_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rename_admin(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rename_admin(text, text) TO service_role;

-- Tighten site_events INSERT policy: instead of WITH CHECK (true),
-- constrain to known event types and sane field sizes.
DROP POLICY IF EXISTS "Anyone can insert site events" ON public.site_events;

CREATE POLICY "Anyone can insert site events"
  ON public.site_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    type IN ('pageview','cta_click','section_view','duration')
    AND session_id IS NOT NULL
    AND length(session_id) <= 128
    AND (path IS NULL OR length(path) <= 512)
    AND (cta_id IS NULL OR length(cta_id) <= 128)
    AND (referrer IS NULL OR length(referrer) <= 1024)
    AND (source IS NULL OR length(source) <= 128)
    AND (user_agent IS NULL OR length(user_agent) <= 1024)
    AND (device IS NULL OR length(device) <= 64)
    AND (country IS NULL OR length(country) <= 8)
    AND (duration_ms IS NULL OR (duration_ms >= 0 AND duration_ms <= 86400000))
  );
