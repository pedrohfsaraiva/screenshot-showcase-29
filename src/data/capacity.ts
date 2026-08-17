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
}

export const defaultCalendar: CalendarParams = {
  diasUteisPorMes: 21,
  horasPorDia: 8,
  feriasDiasAno: 30,
  // Índice realista para operações de alto volume (média de mercado 7–9%).
  absenteismo: 0.08,
  treinamento: 0.02,
};

/**
 * Horas presentes por operador por mês, já descontando férias, absenteísmo e
 * treinamento. A utilização NÃO é aplicada aqui: ela é definida por recurso.
 */
export function horasDisponiveisPorOperadorMes(c: CalendarParams): number {
  const diasLiquidos = Math.max(0, c.diasUteisPorMes - c.feriasDiasAno / 12);
  return (
    diasLiquidos *
    c.horasPorDia *
    Math.max(0, 1 - c.absenteismo) *
    Math.max(0, 1 - c.treinamento)
  );
}

export interface ResourceGroup {
  id: string;
  nome: string;
  stageIds: string[];
  /**
   * Utilização alvo do recurso (0–1). O gargalo opera próximo do máximo e as
   * demais etapas ficam subordinadas ao ritmo do gargalo (evita superprodução
   * e estoque intermediário).
   */
  utilizacaoAlvo: number;
}

/** Recursos separados por família de trabalho (carga somada quando compartilhada). */
export const resourceGroups: ResourceGroup[] = [
  {
    id: "tecido",
    nome: "Tecido (pericárdio e leaflets)",
    stageIds: ["pericardio_prep", "leaflets", "leaflet_matching"],
    utilizacaoAlvo: 0.95,
  },
  { id: "skirt", nome: "Skirt", stageIds: ["inner_skirt"], utilizacaoAlvo: 0.8 },
  {
    id: "sealing",
    nome: "Sealing",
    stageIds: ["sealing_atrial", "sealing_ventricular"],
    utilizacaoAlvo: 0.8,
  },
  {
    id: "stentless",
    nome: "Stentless",
    stageIds: ["inner_stent_prep", "outer_stent_prep", "stentless_assembly"],
    utilizacaoAlvo: 0.82,
  },
  {
    id: "inner_valve",
    nome: "Inner Valve",
    stageIds: ["inner_valve_assembly"],
    utilizacaoAlvo: 0.85,
  },
  { id: "sleeves", nome: "Sleeves", stageIds: ["sleeves"], utilizacaoAlvo: 0.8 },
  {
    id: "full_valve",
    nome: "Full Valve",
    stageIds: [
      "full_valve_assembly",
      "sealings_fixacao",
      "suturas_ligacao",
      "loading_sutures",
    ],
    utilizacaoAlvo: 0.88,
  },
  {
    id: "inspecoes",
    nome: "Inspeções",
    stageIds: ["inner_visual", "dimensional_visual"],
    utilizacaoAlvo: 0.75,
  },
  {
    id: "bdc",
    nome: "BDC (teste hidrodinâmico)",
    stageIds: ["inner_bdc", "full_bdc"],
    utilizacaoAlvo: 0.75,
  },
  {
    id: "esterilizacao",
    nome: "Esterilização",
    stageIds: ["storage", "bioburden_pack"],
    utilizacaoAlvo: 0.7,
  },
  { id: "embalagem", nome: "Embalagem e expedição", stageIds: ["final_pack"], utilizacaoAlvo: 0.7 },
];

export function resourceOfStage(stageId: string): ResourceGroup | undefined {
  return resourceGroups.find((r) => r.stageIds.includes(stageId));
}

/**
 * Curva de aprendizado da equipe: nos primeiros meses de rampa a equipe produz
 * menos por hora, consumindo mais horas padrão para a mesma quantidade.
 * Eficiência 60% no mês 1 chegando a 100% após ~12 meses.
 */
export const learningStart = 0.6;
export const learningMonths = 12;

export function learningEfficiency(monthIndex: number): number {
  if (monthIndex >= learningMonths) return 1;
  const t = Math.max(0, monthIndex) / learningMonths;
  return learningStart + (1 - learningStart) * t;
}

/**
 * Taxas reais de cronoanálise por etapa (unidades/dia/operador, jornada de 8 h).
 * Processos distintos possuem tempos de ciclo distintos.
 */
const taxasPorEtapa: Record<string, { t45: number; t55: number }> = {
  pericardio_prep: { t45: 6, t55: 5.5 },
  leaflets: { t45: 4, t55: 3.4 },
  leaflet_matching: { t45: 8, t55: 7.5 },
  inner_skirt: { t45: 3, t55: 2.5 },
  sealing_atrial: { t45: 2.6, t55: 2.1 },
  sealing_ventricular: { t45: 2.4, t55: 1.9 },
  inner_stent_prep: { t45: 10, t55: 9.5 },
  outer_stent_prep: { t45: 9, t55: 8.5 },
  stentless_assembly: { t45: 2, t55: 1.6 },
  inner_valve_assembly: { t45: 1, t55: 0.8 },
  inner_visual: { t45: 6, t55: 5.5 },
  inner_bdc: { t45: 5, t55: 4.5 },
  sleeves: { t45: 3, t55: 2.4 },
  full_valve_assembly: { t45: 1.6, t55: 1 },
  sealings_fixacao: { t45: 2, t55: 1.3 },
  suturas_ligacao: { t45: 2.2, t55: 1.4 },
  dimensional_visual: { t45: 5, t55: 4.5 },
  loading_sutures: { t45: 4, t55: 3 },
  full_bdc: { t45: 4, t55: 3.6 },
  storage: { t45: 12, t55: 12 },
  bioburden_pack: { t45: 8, t55: 7.5 },
  final_pack: { t45: 10, t55: 9.5 },
};

/** Taxa padrão (unidades/dia/operador) por etapa e modelo. */
export function defaultTaxa(stageId: string, modelId: ModelId): number {
  const conf = taxasPorEtapa[stageId];
  if (!conf) return 1;
  return modelId === "TR1P-45" ? conf.t45 : conf.t55;
}
