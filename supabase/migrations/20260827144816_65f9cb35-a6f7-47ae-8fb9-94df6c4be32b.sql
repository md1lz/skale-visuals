CREATE TABLE public.prestations (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  price_ht numeric not null default 0,
  tva_rate numeric not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.prestations TO service_role;
ALTER TABLE public.prestations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  number text not null unique,
  status text not null default 'Brouillon',
  notes text,
  conditions text,
  valid_until date,
  sign_token text not null unique default replace(gen_random_uuid()::text,'-',''),
  signed_at timestamptz,
  signer_name text,
  signer_ip text,
  signature_data text,
  signed_pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  prestation_id uuid references public.prestations(id) on delete set null,
  label text not null,
  quantity numeric not null default 1,
  unit_price_ht numeric not null default 0,
  tva_rate numeric not null default 0,
  position integer not null default 0
);
GRANT ALL ON public.quote_lines TO service_role;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  number text not null unique,
  status text not null default 'Brouillon',
  notes text,
  conditions text,
  issued_at date not null default current_date,
  due_at date,
  paid_at timestamptz,
  paid_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  label text not null,
  quantity numeric not null default 1,
  unit_price_ht numeric not null default 0,
  tva_rate numeric not null default 0,
  position integer not null default 0
);
GRANT ALL ON public.invoice_lines TO service_role;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_quote_lines_quote ON public.quote_lines(quote_id);
CREATE INDEX idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

INSERT INTO public.prestations (label, price_ht, tva_rate, position) VALUES ('Short', 25, 0, 0);