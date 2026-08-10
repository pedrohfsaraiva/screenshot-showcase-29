import type { ProcessStage, SourceRef } from "@/domain/types";

const src: SourceRef = {
  documento: "Rota Topaz (provisório)",
  status: "provisorio",
};

const s = (
  id: string,
  ordem: number,
  nome: string,
  tipo: ProcessStage["tipo"] = "processo",
): ProcessStage => ({
  id,
  ordem,
  nome,
  tipo,
  yieldId: id,
  leadTimeDias: null,
  retrabalhoPermitido: true,
  ativo: true,
  source: src,
});

export const stages: ProcessStage[] = [
  s("pericardio_prep", 1, "Processamento, seleção e tratamento do pericárdio"),
  s("leaflets", 2, "Fabricação, corte e seleção dos leaflets"),
  s("leaflet_matching", 3, "Casamento (matching) dos leaflets"),
  s("inner_skirt", 4, "Fabricação da inner skirt"),
  s("sealing_atrial", 5, "Fabricação do sealing atrial"),
  s("sealing_ventricular", 6, "Fabricação do sealing ventricular"),
  s("inner_stent_prep", 7, "Limpeza/preparação do Inner Stent"),
  s("outer_stent_prep", 8, "Limpeza/preparação do Outer Stent"),
  s("stentless_assembly", 9, "Submontagem stentless (skirt + leaflets)"),
  s("inner_valve_assembly", 10, "Montagem da Inner Valve (stentless + Inner Stent)"),
  s("inner_visual", 11, "11.A Inspeção visual da Inner Valve", "inspecao"),
  s("inner_bdc", 12, "11.B BDC da Inner Valve", "teste"),
  s("sleeves", 13, "Montagem e inspeção dos sleeves no Outer Stent"),
  s("full_valve_assembly", 14, "União Inner Valve ↔ Outer Stent"),
  s("sealings_final", 15, "Fixação atrial/ventricular sealings + suturas de ligação"),
  s("dimensional_visual", 16, "Inspeções dimensional e visual da Full Valve", "inspecao"),
  s("loading_sutures", 17, "Montagem e inspeção das loading sutures"),
  s("full_bdc", 18, "Teste hidrodinâmico BDC da Full Valve", "teste"),
  s("storage", 19, "Armazenamento em solução", "armazenamento"),
  s("bioburden_pack", 20, "Redução de biocarga, embalagem primária, esterilização", "embalagem"),
  s("final_pack", 21, "Rotulagem, barrier seal, embalagem final e expedição", "embalagem"),
];
