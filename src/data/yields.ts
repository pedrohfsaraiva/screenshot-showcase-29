import type { YieldParameter, SourceRef, ModelId } from "@/domain/types";

const src: SourceRef = {
  documento: "Parâmetros iniciais (provisório)",
  status: "provisorio",
};

const stageIds = [
  "pericardio_prep",
  "leaflets",
  "leaflet_matching",
  "inner_skirt",
  "sealing_atrial",
  "sealing_ventricular",
  "inner_stent_prep",
  "outer_stent_prep",
  "stentless_assembly",
  "inner_valve_assembly",
  "inner_visual",
  "inner_bdc",
  "sleeves",
  "full_valve_assembly",
  "sealings_fixacao",
  "suturas_ligacao",
  "dimensional_visual",
  "loading_sutures",
  "full_bdc",
  "storage",
  "bioburden_pack",
  "final_pack",
];

const modelos: ModelId[] = ["TR1P-45", "TR1P-55"];

// Yields agora são por (etapa, modelo) — componentes possuem taxas de perda
// distintas conforme o tamanho da válvula. Todos nascem null → DADO A CONFIRMAR.
export const yields: YieldParameter[] = stageIds.flatMap((stageId) =>
  modelos.map<YieldParameter>((modelId) => ({
    id: `${stageId}__${modelId}`,
    stageId,
    modelId,
    valor: null,
    tipoPerda: "sucata",
    source: src,
  })),
);
