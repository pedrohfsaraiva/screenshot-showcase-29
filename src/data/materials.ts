import type { Material, SourceRef } from "@/domain/types";

const src: SourceRef = {
  documento: "Cadastro inicial (provisório)",
  status: "provisorio",
};

const m = (
  id: string,
  descricao: string,
  categoria: string,
  unidade: string,
  reutilizavel = false,
): Material => ({
  id,
  descricao,
  categoria,
  unidade,
  custoCentavos: null,
  leadTimeMeses: null,
  estoqueSeguranca: 0,
  loteMinimo: 0,
  multiploCompra: 1,
  reutilizavel,
  source: src,
});

export const materials: Material[] = [
  m("pericardio_bruto", "Pericárdio porcino bruto", "Biológico", "peça"),
  m("leaflet", "Leaflet processado", "Biológico intermediário", "peça"),
  m("inner_skirt", "Inner skirt", "Tecido/biológico", "peça"),
  m("sealing_atrial", "Sealing atrial", "Tecido/biológico", "peça"),
  m("sealing_ventricular", "Sealing ventricular", "Tecido/biológico", "peça"),
  m("inner_stent", "Inner Stent", "Estrutural", "peça"),
  m("outer_stent", "Outer Stent", "Estrutural", "peça"),
  m("sleeve", "Sleeve", "Estrutural", "peça"),
  m("sutura_montagem", "Sutura de montagem", "Consumível", "cm"),
  m("sutura_loading", "Sutura de loading", "Consumível", "cm"),
  m("solucao_tratamento", "Solução de tratamento", "Solução", "mL"),
  m("solucao_armazenagem", "Solução de armazenagem", "Solução", "mL"),
  m("embalagem_primaria", "Embalagem primária", "Embalagem", "peça"),
  m("barrier_seal", "Barrier seal", "Embalagem", "peça"),
  m("label_tampa", "Etiqueta da tampa", "Embalagem", "peça"),
  m("label_traveller", "Etiqueta traveller", "Embalagem", "peça"),
  m("embalagem_secundaria", "Embalagem secundária", "Embalagem", "peça"),
];
