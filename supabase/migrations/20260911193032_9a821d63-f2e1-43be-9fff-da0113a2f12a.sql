GRANT SELECT ON public.dim_componentes TO authenticated;
GRANT ALL ON public.dim_componentes TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dim_componentes' AND policyname = 'dim_componentes_read'
  ) THEN
    EXECUTE 'CREATE POLICY dim_componentes_read ON public.dim_componentes FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

ALTER TABLE public.dim_componentes ENABLE ROW LEVEL SECURITY;