CREATE POLICY "prestations_no_public_access" ON public.prestations FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "quotes_no_public_access" ON public.quotes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "quote_lines_no_public_access" ON public.quote_lines FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "invoices_no_public_access" ON public.invoices FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "invoice_lines_no_public_access" ON public.invoice_lines FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);