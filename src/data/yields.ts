import type { YieldParameter, SourceRef } from "@/domain/types";

const src: SourceRef = {
  documento: "Parâmetros iniciais (provisório)",
  status: "provisorio",
};

// Todos os yields nascem null → DADO A CONFIRMAR.
// O usuário aprova cada gate individualmente via slider e vinculação a fonte.
const y = (stageId: string): YieldParameter => ({
  id: stageId,
  stageId,
  valor: null,
  tipoPerda: "sucata",
  source: src,
});

export const yields: YieldParameter[] = [
  y("pericardio_prep"),
  y("leaflets"),
  y("leaflet_matching"),
  y("inner_skirt"),
  y("sealing_atrial"),
  y("sealing_ventricular"),
  y("inner_stent_prep"),
  y("outer_stent_prep"),
  y("stentless_assembly"),
  y("inner_valve_assembly"),
  y("inner_bdc"),
  y("sleeves"),
  y("full_valve_assembly"),
  y("sealings_final"),
  y("dimensional_visual"),
  y("loading_sutures"),
  y("full_bdc"),
  y("storage"),
  y("bioburden_pack"),
  y("final_pack"),
];
