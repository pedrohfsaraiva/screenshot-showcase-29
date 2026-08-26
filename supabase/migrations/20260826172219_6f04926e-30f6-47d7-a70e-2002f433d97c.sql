-- 1. Revoke anon access
REVOKE ALL ON public.dim_componentes FROM anon;
REVOKE ALL ON public.fato_rendimentos FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dim_componentes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fato_rendimentos TO authenticated;
GRANT ALL ON public.dim_componentes TO service_role;
GRANT ALL ON public.fato_rendimentos TO service_role;

-- 2. RLS policies restricted to authenticated
DROP POLICY IF EXISTS dim_componentes_read ON public.dim_componentes;
DROP POLICY IF EXISTS dim_componentes_write ON public.dim_componentes;
DROP POLICY IF EXISTS fato_rendimentos_read ON public.fato_rendimentos;
DROP POLICY IF EXISTS fato_rendimentos_write ON public.fato_rendimentos;

CREATE POLICY dim_componentes_read ON public.dim_componentes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY dim_componentes_write ON public.dim_componentes
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY fato_rendimentos_read ON public.fato_rendimentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY fato_rendimentos_write ON public.fato_rendimentos
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Constraint de limite do rendimento
ALTER TABLE public.fato_rendimentos
  ADD CONSTRAINT chk_rendimento_limite CHECK (rendimento >= 0 AND rendimento <= 100);

-- 4. Coluna updated_at
ALTER TABLE public.dim_componentes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.fato_rendimentos
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 5. Trigger de sanitização atualizada
CREATE OR REPLACE FUNCTION public.sanitize_fato_rendimentos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.nome_indicador := btrim(NEW.nome_indicador);
  NEW.rendimento := round(NEW.rendimento, 4);
  NEW.data_atualizacao := CURRENT_DATE;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;