import type { BomLine, SourceRef } from "@/domain/types";

const src: SourceRef = {
  documento: "BOM Topaz (provisório)",
  status: "provisorio",
};

const line = (
  parentId: string,
  childId: string,
  qtyPer: number | null,
  stageId: string,
  modelId?: BomLine["modelId"],
): BomLine => ({ parentId, childId, qtyPer, stageId, modelId, source: src });

// BOM lógica inicial. Quantidades definitivas ficam DADO A CONFIRMAR (null)
// exceto sleeves, cuja diferença por tamanho está no enunciado.
export const bom: BomLine[] = [
  line("full_valve", "leaflet", 3, "stentless_assembly"),
  line("full_valve", "inner_skirt", 1, "stentless_assembly"),
  line("full_valve", "sealing_atrial", 1, "sealings_fixacao"),
  line("full_valve", "sealing_ventricular", 1, "sealings_fixacao"),
  line("full_valve", "inner_stent", 1, "inner_valve_assembly"),
  line("full_valve", "outer_stent", 1, "full_valve_assembly"),
  line("full_valve", "sleeve", 6, "sleeves", "TR1P-45"),
  line("full_valve", "sleeve", 9, "sleeves", "TR1P-55"),
  line("full_valve", "fio_teleflex_20", null, "stentless_assembly", "TR1P-45"),
  line("full_valve", "fio_teleflex_20", null, "stentless_assembly", "TR1P-55"),
  line("full_valve", "fio_teleflex_50", null, "loading_sutures", "TR1P-45"),
  line("full_valve", "fio_teleflex_50", null, "loading_sutures", "TR1P-55"),
  line("full_valve", "fio_teleflex_60", null, "suturas_ligacao", "TR1P-45"),
  line("full_valve", "fio_teleflex_60", null, "suturas_ligacao", "TR1P-55"),
  line("full_valve", "solucao_transporte", null, "full_valve_assembly", "TR1P-45"),
  line("full_valve", "solucao_transporte", null, "full_valve_assembly", "TR1P-55"),
  line("full_valve", "embalagem_primaria", 1, "bioburden_pack"),
  line("full_valve", "barrier_seal", 1, "final_pack"),
  line("full_valve", "label_tampa", 1, "final_pack"),
  line("full_valve", "label_traveller", 1, "final_pack"),
  line("full_valve", "embalagem_secundaria", 1, "final_pack"),
];
