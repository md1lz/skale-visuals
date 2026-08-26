SELECT cron.unschedule('booking-reminders');

SELECT cron.schedule(
  'booking-reminders',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--bb5c7e2e-5d97-4e16-8071-ad682d90c2d6.lovable.app/api/public/hooks/booking-reminders',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Z2dzdGNjb2NqcWxtd29pcWpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NjYxNjgsImV4cCI6MjA5ODM0MjE2OH0.1HUDx-4sGDKPXAH28nTykbSSFYWqgprZ1KTpJ_PZGAM"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);