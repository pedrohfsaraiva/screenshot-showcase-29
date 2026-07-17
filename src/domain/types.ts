// Domain types for the Topaz MRP application.
// Kept free of runtime dependencies so /engine can consume them in tests.

export type ApprovalStatus = "provisorio" | "em_revisao" | "aprovado" | "obsoleto";

export type ConversionMode = "pericardios_por_unidade_boa" | "unidades_boas_por_pericardio";

export type StageType =
  | "processo"
  | "inspecao"
  | "teste"
  | "armazenamento"
  | "embalagem";

export type YieldLossType = "sucata" | "retrabalho" | "misto";

export type LotSizingPolicy = "lot_for_lot" | "fixo" | "moq_multiplo";

export type ModelId = "TR1P-45" | "TR1P-55";

export interface SourceRef {
  documento: string;
  revisao?: string;
  secao?: string;
  vigencia?: string;
  status: ApprovalStatus;
}

export interface ProductModel {
  id: ModelId;
  nome: string;
  aliases: string[];
  bomRevision: string;
  routeRevision: string;
}

export interface Material {
  id: string;
  descricao: string;
  categoria: string;
  unidade: string;
  /** Custo unitário em centavos (inteiros) para evitar ponto flutuante. */
  custoCentavos: number | null;
  leadTimeMeses: number | null;
  estoqueSeguranca: number;
  loteMinimo: number;
  multiploCompra: number;
  reutilizavel: boolean;
  source: SourceRef;
}

export interface BomLine {
  parentId: string;
  childId: string;
  /** Quantidade do filho por unidade do pai. */
  qtyPer: number | null;
  stageId: string;
  yieldId?: string;
  /** Diferenciação por modelo quando aplicável. */
  modelId?: ModelId;
  source: SourceRef;
}

export interface ProcessStage {
  id: string;
  ordem: number;
  nome: string;
  tipo: StageType;
  /** Input canonical do estágio (item consumido / entrada). */
  inputId?: string;
  /** Output canonical do estágio (item aprovado que sai). */
  outputId?: string;
  yieldId?: string;
  leadTimeDias: number | null;
  recursoId?: string;
  minutosPorUnidade?: number | null;
  minutosPorLote?: number | null;
  retrabalhoPermitido: boolean;
  /** Ativo no cenário aprovado; alterações devem ficar em cenários de engenharia. */
  ativo: boolean;
  source: SourceRef;
}

export interface YieldParameter {
  id: string;
  /** Etapa da rota à qual pertence este yield. */
  stageId: string;
  /** Se nulo, o valor é DADO A CONFIRMAR e o cálculo deve alertar. */
  valor: number | null;
  tipoPerda: YieldLossType;
  /** Diferenciação por modelo (opcional). */
  modelId?: ModelId;
  source: SourceRef;
}

export interface DemandPeriod {
  modelId: ModelId;
  /** ISO YYYY-MM. */
  periodo: string;
  demanda: number;
}

export interface InventoryPeriod {
  itemId: string;
  periodo: string;
  saldoInicial: number;
  recebimentosProgramados: number;
}

export interface BioConversion {
  componentId: string;
  mode: ConversionMode;
  factor: number | null;
  source: SourceRef;
}

export interface Scenario {
  id: string;
  nome: string;
  /** ISO YYYY-MM-01. */
  baseDate: string;
  status: ApprovalStatus;
  notes: string;
}
