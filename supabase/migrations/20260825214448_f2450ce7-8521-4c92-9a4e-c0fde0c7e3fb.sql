CREATE TABLE public.call_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  guests text[] NOT NULL DEFAULT '{}',
  slot_date date NOT NULL,
  slot_time text NOT NULL,
  location_type text NOT NULL DEFAULT 'meet',
  phone text,
  notes text,
  status text NOT NULL DEFAULT 'Confirmé',
  meet_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX call_bookings_slot_unique ON public.call_bookings (slot_date, slot_time) WHERE status <> 'Annulé';

GRANT ALL ON public.call_bookings TO service_role;

ALTER TABLE public.call_bookings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER call_bookings_touch BEFORE UPDATE ON public.call_bookings FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();