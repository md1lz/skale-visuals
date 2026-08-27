ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS signature_data_url TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signer_name TEXT,
  ADD COLUMN IF NOT EXISTS signer_ip TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;

UPDATE public.quotes SET signature_data_url = signature_data WHERE signature_data_url IS NULL AND signature_data IS NOT NULL;

NOTIFY pgrst, 'reload schema';