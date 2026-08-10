import type { ModelId } from "@/domain/types";

/**
 * Ponte entre o banco (dim_componentes.etapa_correspondente / tamanho)
 * e as etapas da rota + modelos do cenário.
 * As etapas 11.A e 11.B permanecem desmembradas.
 */
export const ETAPA_TO_STAGE: Record<string, string> = {
  "2 Fabricação, corte e seleção dos leaflets": "leaflets",
  "4 Fabricação da inner skirt": "inner_skirt",
  "5 Fabricação do sealing atrial": "sealing_atrial",
  "6 Fabricação do sealing ventricular": "sealing_ventricular",
  "9 Submontagem stentless (skirt + leaflets)": "stentless_assembly",
  "11.A Inspeção visual": "inner_visual",
  "11.B BDC da Inner Valve": "inner_bdc",
  "12 Montagem e inspeção dos sleeves no Outer Stent": "sleeves",
  "15 Inspeções dimensional e visual da Full Valve": "dimensional_visual",
  "17 Teste hidrodinâmico BDC da Full Valve": "full_bdc",
};

/** Componentes de RTY não são etapas: servem como prova real. */
export const ETAPA_RTY = "Rolled Throughput Yield (pericárdio -> full valve)";

export const TAMANHO_TO_MODELS: Record<string, ModelId[]> = {
  TRC: ["TR1P-45"],
  TRM: ["TR1P-55"],
  Ambos: ["TR1P-45", "TR1P-55"],
};

export const LIMITE_DIAS_DEFASAGEM = 30;

export interface RendimentoStatusRow {
  id_componente: number;
  identificacao: string;
  etapa_correspondente: string;
  tamanho: string;
  nome_indicador: string | null;
  rendimento: number | null;
  data_atualizacao: string | null;
  dias_desde_atualizacao: number | null;
  status_dados: string;
}

export interface MappedRendimento {
  stageId: string;
  modelId: ModelId;
  valor: number;
  row: RendimentoStatusRow;
}

/** Converte linhas da view em pares (etapa, modelo) aplicáveis aos yields. */
export function mapRendimentos(rows: RendimentoStatusRow[]): MappedRendimento[] {
  const out: MappedRendimento[] = [];
  for (const row of rows) {
    if (row.rendimento === null) continue;
    const stageId = ETAPA_TO_STAGE[row.etapa_correspondente.trim()];
    if (!stageId) continue;
    const models = TAMANHO_TO_MODELS[row.tamanho.trim()] ?? [];
    for (const modelId of models) {
      out.push({ stageId, modelId, valor: Number(row.rendimento), row });
    }
  }
  return out;
}

export function isDefasado(row: RendimentoStatusRow): boolean {
  return row.status_dados !== "Atualizado";
}
