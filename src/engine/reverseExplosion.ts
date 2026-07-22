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
  modelId?: string,
): ExplosionResult {
  const active = stages.filter((s) => s.ativo).sort((a, b) => a.ordem - b.ordem);
  const yieldByStage = new Map<string, YieldParameter>();
  // Prioriza yields do modelo pedido; cai para yields sem modelo como fallback.
  for (const y of yields) {
    if (modelId && y.modelId && y.modelId !== modelId) continue;
    const existing = yieldByStage.get(y.stageId);
    if (!existing) {
      yieldByStage.set(y.stageId, y);
    } else if (modelId && existing.modelId !== modelId && y.modelId === modelId) {
      yieldByStage.set(y.stageId, y);
    }
  }

  const rec: StageReconciliation[] = [];
  let currentOutput = demandaFinal;
  let temProvisorio = false;

  for (let i = active.length - 1; i >= 0; i--) {
    const stage = active[i];
    const y = yieldByStage.get(stage.id);
    const rate = y?.valor ?? null;
    const rateEfetiva = rate !== null && rate > 0 ? rate : 1;
    if (rate === null || rate <= 0) temProvisorio = true;
    const entrada = grossFromNet(currentOutput, rateEfetiva);
    rec.unshift({
      stageId: stage.id,
      stageName: stage.nome,
      ordem: stage.ordem,
      saidaAprovada: currentOutput,
      entradaBruta: entrada,
      perdaTotal: entrada - currentOutput,
      yieldRate: rate,
      provisorio: rate === null || rate <= 0,
    });
    currentOutput = entrada;
  }

  return {
    necessidadeInicial: currentOutput,
    reconciliacao: rec,
    temProvisorio,
  };
}
