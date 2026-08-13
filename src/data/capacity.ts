import type { ModelId } from "@/domain/types";

/** Parâmetros de calendário de capacidade (horas padrão). */
export interface CalendarParams {
  /** Dias úteis por mês (antes de férias/absenteísmo). */
  diasUteisPorMes: number;
  /** Horas trabalhadas por dia. */
  horasPorDia: number;
  /** Dias de férias por operador por ano. */
  feriasDiasAno: number;
  /** Absenteísmo em fração (0–1). */
  absenteismo: number;
  /** Treinamento em fração (0–1). */
  treinamento: number;
  /** Utilização efetiva do tempo produtivo em fração (0–1). */
  utilizacao: number;
}

export const defaultCalendar: CalendarParams = {
  diasUteisPorMes: 21,
  horasPorDia: 8,
  feriasDiasAno: 30,
  absenteismo: 0.03,
  treinamento: 0.02,
  utilizacao: 0.85,
};

/** Horas disponíveis por operador por mês, já descontando perdas de calendário. */
export function horasDisponiveisPorOperadorMes(c: CalendarParams): number {
  const diasLiquidos = Math.max(0, c.diasUteisPorMes - c.feriasDiasAno / 12);
  return (
    diasLiquidos *
    c.horasPorDia *
    Math.max(0, 1 - c.absenteismo) *
    Math.max(0, 1 - c.treinamento) *
    Math.max(0, Math.min(1, c.utilizacao))
  );
}

export interface ResourceGroup {
  id: string;
  nome: string;
  stageIds: string[];
}

/** Recursos separados por família de trabalho (carga somada quando compartilhada). */
export const resourceGroups: ResourceGroup[] = [
  { id: "tecido", nome: "Tecido (pericárdio e leaflets)", stageIds: ["pericardio_prep", "leaflets", "leaflet_matching"] },
  { id: "skirt", nome: "Skirt", stageIds: ["inner_skirt"] },
  { id: "sealing", nome: "Sealing", stageIds: ["sealing_atrial", "sealing_ventricular"] },
  { id: "stentless", nome: "Stentless", stageIds: ["inner_stent_prep", "outer_stent_prep", "stentless_assembly"] },
  { id: "inner_valve", nome: "Inner Valve", stageIds: ["inner_valve_assembly"] },
  { id: "sleeves", nome: "Sleeves", stageIds: ["sleeves"] },
  {
    id: "full_valve",
    nome: "Full Valve",
    stageIds: ["full_valve_assembly", "sealings_fixacao", "suturas_ligacao", "loading_sutures"],
  },
  { id: "inspecoes", nome: "Inspeções", stageIds: ["inner_visual", "dimensional_visual"] },
  { id: "bdc", nome: "BDC (teste hidrodinâmico)", stageIds: ["inner_bdc", "full_bdc"] },
  { id: "esterilizacao", nome: "Esterilização", stageIds: ["storage", "bioburden_pack"] },
  { id: "embalagem", nome: "Embalagem e expedição", stageIds: ["final_pack"] },
];

export function resourceOfStage(stageId: string): ResourceGroup | undefined {
  return resourceGroups.find((r) => r.stageIds.includes(stageId));
}

/**
 * Defaults conversíveis do documento:
 * - stentless = 2 unidades/dia/operador
 * - inner = 1 unidade/dia/operador
 * - full = 1,5 operador-dia (45) e 2,5 operador-dia (55) → 1/1,5 e 1/2,5 un/dia/op
 */
const FULL_45 = 1 / 1.5;
const FULL_55 = 1 / 2.5;

const byResource: Record<string, { t45: number; t55: number }> = {
  tecido: { t45: 2, t55: 2 },
  skirt: { t45: 2, t55: 2 },
  sealing: { t45: 2, t55: 2 },
  stentless: { t45: 2, t55: 2 },
  inner_valve: { t45: 1, t55: 1 },
  sleeves: { t45: 2, t55: 2 },
  full_valve: { t45: FULL_45, t55: FULL_55 },
  inspecoes: { t45: 1, t55: 1 },
  bdc: { t45: 1, t55: 1 },
  esterilizacao: { t45: FULL_45, t55: FULL_55 },
  embalagem: { t45: FULL_45, t55: FULL_55 },
};

/** Taxa padrão (unidades/dia/operador) por etapa e modelo. */
export function defaultTaxa(stageId: string, modelId: ModelId): number {
  const r = resourceOfStage(stageId);
  const conf = r ? byResource[r.id] : undefined;
  if (!conf) return 1;
  return modelId === "TR1P-45" ? conf.t45 : conf.t55;
}
