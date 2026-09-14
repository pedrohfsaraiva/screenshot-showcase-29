GRANT SELECT ON public.dim_componentes TO anon;
GRANT SELECT ON public.fato_rendimentos TO anon;
GRANT SELECT ON public.vw_rendimentos_status TO anon;
GRANT SELECT ON public.vw_rendimentos_status TO authenticated;

CREATE POLICY "dim_componentes_read_anon" ON public.dim_componentes FOR SELECT TO anon USING (true);
CREATE POLICY "fato_rendimentos_read_anon" ON public.fato_rendimentos FOR SELECT TO anon USING (true);