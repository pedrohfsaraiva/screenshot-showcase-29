import type { YieldParameter, SourceRef, ModelId } from "@/domain/types";

const src: SourceRef = {
  documento: "Parâmetros iniciais (provisório)",
  status: "provisorio",
};

/**
 * Yields realistas por etapa (fração de aprovação). A etapa de pericárdio já
 * considera a conversão de área de tecido em peças aprovadas, evitando a
 * distorção anterior (>99% de perda acumulada na etapa 1).
 */
const yieldsPorEtapa: Record<string, { v45: number; v55: number }> = {
  pericardio_prep: { v45: 0.88, v55: 0.85 },
  leaflets: { v45: 0.93, v55: 0.91 },
  leaflet_matching: { v45: 0.97, v55: 0.96 },
  inner_skirt: { v45: 0.97, v55: 0.96 },
  sealing_atrial: { v45: 0.97, v55: 0.96 },
  sealing_ventricular: { v45: 0.97, v55: 0.96 },
  inner_stent_prep: { v45: 0.995, v55: 0.995 },
  outer_stent_prep: { v45: 0.995, v55: 0.995 },
  stentless_assembly: { v45: 0.97, v55: 0.96 },
  inner_valve_assembly: { v45: 0.97, v55: 0.96 },
  inner_visual: { v45: 0.98, v55: 0.97 },
  inner_bdc: { v45: 0.98, v55: 0.97 },
  sleeves: { v45: 0.985, v55: 0.98 },
  full_valve_assembly: { v45: 0.97, v55: 0.96 },
  sealings_fixacao: { v45: 0.98, v55: 0.97 },
  suturas_ligacao: { v45: 0.98, v55: 0.97 },
  dimensional_visual: { v45: 0.98, v55: 0.975 },
  loading_sutures: { v45: 0.99, v55: 0.985 },
  full_bdc: { v45: 0.98, v55: 0.975 },
  storage: { v45: 0.998, v55: 0.998 },
  bioburden_pack: { v45: 0.99, v55: 0.99 },
  final_pack: { v45: 0.995, v55: 0.995 },
};

const stageIds = Object.keys(yieldsPorEtapa);

const modelos: ModelId[] = ["TR1P-45", "TR1P-55"];

// Yields por (etapa, modelo) — componentes possuem taxas de perda distintas
// conforme o tamanho da válvula.
export const yields: YieldParameter[] = stageIds.flatMap((stageId) =>
  modelos.map<YieldParameter>((modelId) => ({
    id: `${stageId}__${modelId}`,
    stageId,
    modelId,
    valor:
      modelId === "TR1P-45"
        ? yieldsPorEtapa[stageId].v45
        : yieldsPorEtapa[stageId].v55,
    tipoPerda: "sucata",
    source: src,
  })),
);
