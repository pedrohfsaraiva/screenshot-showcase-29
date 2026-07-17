import type { ProcessStage, YieldParameter } from "@/domain/types";
import { grossFromNet } from "./yield";

export interface StageReconciliation {
  stageId: string;
  stageName: string;
  ordem: number;
  saidaAprovada: number;
  entradaBruta: number;
  /** Diferença total (sucata + retrabalho tratados como um só valor aqui). */
  perdaTotal: number;
  yieldRate: number | null;
  /** true quando a etapa possui yield provisório/nulo. */
  provisorio: boolean;
}

export interface ExplosionResult {
  /** Necessidade de entrada da primeira etapa (matéria-prima na base da rota). */
  necessidadeInicial: number;
  reconciliacao: StageReconciliation[];
  temProvisorio: boolean;
}

/**
 * Percorre a rota em ordem reversa (última → primeira) e calcula
 * a necessidade de entrada de cada etapa a partir da demanda final.
 * Yields null são tratados como 1 (100%) mas sinalizam provisório.
 */
export function reverseExplode(
  demandaFinal: number,
  stages: ProcessStage[],
  yields: YieldParameter[],
): ExplosionResult {
  const active = stages.filter((s) => s.ativo).sort((a, b) => a.ordem - b.ordem);
  const yieldByStage = new Map<string, YieldParameter>();
  for (const y of yields) yieldByStage.set(y.stageId, y);

  const rec: StageReconciliation[] = [];
  let currentOutput = demandaFinal;
  let temProvisorio = false;

  for (let i = active.length - 1; i >= 0; i--) {
    const stage = active[i];
    const y = yieldByStage.get(stage.id);
    const rate = y?.valor ?? null;
    const rateEfetiva = rate ?? 1;
    if (rate === null) temProvisorio = true;
    const entrada = grossFromNet(currentOutput, rateEfetiva);
    rec.unshift({
      stageId: stage.id,
      stageName: stage.nome,
      ordem: stage.ordem,
      saidaAprovada: currentOutput,
      entradaBruta: entrada,
      perdaTotal: entrada - currentOutput,
      yieldRate: rate,
      provisorio: rate === null,
    });
    currentOutput = entrada;
  }

  return {
    necessidadeInicial: currentOutput,
    reconciliacao: rec,
    temProvisorio,
  };
}
