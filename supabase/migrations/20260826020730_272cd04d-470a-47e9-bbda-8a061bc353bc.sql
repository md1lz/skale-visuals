ALTER TABLE public.call_bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS meet_link_sent_at timestamptz;