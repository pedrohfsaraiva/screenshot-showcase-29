GRANT INSERT, UPDATE ON public.fato_rendimentos TO anon;

CREATE POLICY "fato_rendimentos_write_anon" ON public.fato_rendimentos FOR ALL TO anon USING (true) WITH CHECK (true);