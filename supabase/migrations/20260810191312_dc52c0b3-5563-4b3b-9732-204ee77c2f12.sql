CREATE TABLE public.dim_componentes (
  id_componente INT PRIMARY KEY,
  identificacao VARCHAR(120) NOT NULL,
  etapa_correspondente VARCHAR(160) NOT NULL,
  tamanho VARCHAR(10) NOT NULL CHECK (tamanho IN ('TRC','TRM','Ambos')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dim_componentes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dim_componentes TO anon;
GRANT ALL ON public.dim_componentes TO service_role;
ALTER TABLE public.dim_componentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dim_componentes_read" ON public.dim_componentes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dim_componentes_write" ON public.dim_componentes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.fato_rendimentos (
  id BIGSERIAL PRIMARY KEY,
  id_componente INT NOT NULL REFERENCES public.dim_componentes(id_componente) ON DELETE CASCADE,
  nome_indicador VARCHAR(160) NOT NULL,
  rendimento NUMERIC(9,4) NOT NULL,
  data_atualizacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fato_rendimentos_componente ON public.fato_rendimentos (id_componente, data_atualizacao DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fato_rendimentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fato_rendimentos TO anon;
GRANT ALL ON public.fato_rendimentos TO service_role;
ALTER TABLE public.fato_rendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fato_rendimentos_read" ON public.fato_rendimentos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "fato_rendimentos_write" ON public.fato_rendimentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Higienizacao: TRIM em strings + arredondamento a 4 casas
CREATE OR REPLACE FUNCTION public.sanitize_fato_rendimentos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.nome_indicador := btrim(NEW.nome_indicador);
  NEW.rendimento := round(NEW.rendimento, 4);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_fato_rendimentos
BEFORE INSERT OR UPDATE ON public.fato_rendimentos
FOR EACH ROW EXECUTE FUNCTION public.sanitize_fato_rendimentos();

CREATE OR REPLACE FUNCTION public.sanitize_dim_componentes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.identificacao := btrim(NEW.identificacao);
  NEW.etapa_correspondente := btrim(NEW.etapa_correspondente);
  NEW.tamanho := btrim(NEW.tamanho);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sanitize_dim_componentes
BEFORE INSERT OR UPDATE ON public.dim_componentes
FOR EACH ROW EXECUTE FUNCTION public.sanitize_dim_componentes();

-- Ultimo rendimento por componente + status de defasagem (>30 dias)
CREATE VIEW public.vw_rendimentos_status
WITH (security_invoker = true)
AS
SELECT
  d.id_componente,
  d.identificacao,
  d.etapa_correspondente,
  d.tamanho,
  f.nome_indicador,
  f.rendimento,
  f.data_atualizacao,
  (CURRENT_DATE - f.data_atualizacao) AS dias_desde_atualizacao,
  CASE
    WHEN f.data_atualizacao IS NULL THEN 'Pendente/Desatualizado'
    WHEN (CURRENT_DATE - f.data_atualizacao) > 30 THEN 'Pendente/Desatualizado'
    ELSE 'Atualizado'
  END AS status_dados
FROM public.dim_componentes d
LEFT JOIN LATERAL (
  SELECT r.nome_indicador, r.rendimento, r.data_atualizacao
  FROM public.fato_rendimentos r
  WHERE r.id_componente = d.id_componente
  ORDER BY r.data_atualizacao DESC, r.id DESC
  LIMIT 1
) f ON TRUE;

GRANT SELECT ON public.vw_rendimentos_status TO anon, authenticated, service_role;

INSERT INTO public.dim_componentes (id_componente, identificacao, etapa_correspondente, tamanho) VALUES
 (1,'Stentless TRC','9 Submontagem stentless (skirt + leaflets)','TRC'),
 (2,'Inner Visual TRC','11.A Inspeção visual','TRC'),
 (3,'Inner BDC TRC','11.B BDC da Inner Valve','TRC'),
 (4,'Sleeve TRC','12 Montagem e inspeção dos sleeves no Outer Stent','TRC'),
 (5,'BDC Labcor TRC','15 Inspeções dimensional e visual da Full Valve','TRC'),
 (6,'BDC Tricares TRC','17 Teste hidrodinâmico BDC da Full Valve','TRC'),
 (7,'RTY TRC','Rolled Throughput Yield (pericárdio -> full valve)','TRC'),
 (8,'Stentless TRM','9 Submontagem stentless (skirt + leaflets)','TRM'),
 (9,'Inner Visual TRM','11.A Inspeção visual','TRM'),
 (10,'Inner BDC TRM','11.B BDC da Inner Valve','TRM'),
 (11,'Sleeve TRM','12 Montagem e inspeção dos sleeves no Outer Stent','TRM'),
 (12,'BDC Labcor TRM','15 Inspeções dimensional e visual da Full Valve','TRM'),
 (13,'BDC Tricares TRM','17 Teste hidrodinâmico BDC da Full Valve','TRM'),
 (14,'RTY TRM','Rolled Throughput Yield (pericárdio -> full valve)','TRM'),
 (15,'Folhetos','2 Fabricação, corte e seleção dos leaflets','Ambos'),
 (16,'Sealing Atrial TRC','5 Fabricação do sealing atrial','TRC'),
 (17,'Sealing Atrial TRM','5 Fabricação do sealing atrial','TRM'),
 (18,'Sealing Ventricular TRC','6 Fabricação do sealing ventricular','TRC'),
 (19,'Sealing Ventricular TRM','6 Fabricação do sealing ventricular','TRM'),
 (20,'Skirt TRC','4 Fabricação da inner skirt','TRC'),
 (21,'Skirt TRM','4 Fabricação da inner skirt','TRM');