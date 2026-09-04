import { useMemo } from "react";
import { useScenario } from "@/state/ScenarioContext";
import { reverseExplode } from "@/engine/reverseExplosion";
import {
  defaultTaxa,
  horasDisponiveisPorOperadorMes,
  learningEfficiency,
  resourceGroups,
} from "@/data/capacity";
import type { ModelId } from "@/domain/types";

export interface CapacityFteSummary {
  /** Carga total (horas padrão) no conjunto de períodos. */
  horasTotal: number;
  /** Capacidade disponível (horas) no conjunto de períodos. */
  capacidadeTotal: number;
  /** Colaboradores necessários em média no período. */
  fteMedio: number;
  /** Colaboradores necessários no mês de pico. */
  ftePico: number;
  /** Colaboradores atualmente alocados. */
  operadoresAtuais: number;
  /** Horas por período (carga vs. capacidade). */
  porPeriodo: Array<{ periodo: string; horas: number; capacidade: number }>;
}

/**
 * Resumo de capacidade reutilizável (mesmas fórmulas da página Capacidade,
 * sem nivelamento): usado no KPI de colaboradores da Visão Geral.
 */
export function useCapacityFte(periodos: string[], modelo: "all" | ModelId): CapacityFteSummary {
  const { state } = useScenario();

  return useMemo(() => {
    const cal = state.calendar;
    const horasPorOperadorMes = horasDisponiveisPorOperadorMes(cal);

    const taxaDe = (stageId: string, modelId: ModelId): number => {
      const c = state.capacity[stageId];
      const v = modelId === "TR1P-45" ? c?.taxaPorDia45 : c?.taxaPorDia55;
      return v !== null && v !== undefined && v > 0 ? v : defaultTaxa(stageId, modelId);
    };

    const porEtapaPeriodo: Record<string, Record<string, number>> = {};
    for (const p of state.products) {
      if (modelo !== "all" && p.id !== modelo) continue;
      for (const periodo of periodos) {
        const demanda = state.demand
          .filter((d) => d.modelId === p.id && d.periodo === periodo)
          .reduce((a, d) => a + d.demanda, 0);
        if (demanda <= 0) continue;
        const exp = reverseExplode(demanda, state.stages, state.yields, p.id);
        const eff = learningEfficiency(state.periodos.indexOf(periodo));
        for (const r of exp.reconciliacao) {
          const taxa = taxaDe(r.stageId, p.id);
          const horas = taxa > 0 ? ((r.entradaBruta / taxa) * cal.horasPorDia) / eff : 0;
          porEtapaPeriodo[r.stageId] ??= {};
          porEtapaPeriodo[r.stageId][periodo] =
            (porEtapaPeriodo[r.stageId][periodo] ?? 0) + horas;
        }
      }
    }

    let horasTotal = 0;
    let capacidadeTotalMes = 0;
    let fteMedio = 0;
    let ftePico = 0;
    let operadoresAtuais = 0;
    const cargaPorPeriodo: Record<string, number> = {};

    for (const g of resourceGroups) {
      const horasEfetivasOperador = horasPorOperadorMes * g.utilizacaoAlvo;
      const operadores = state.capacity[`res:${g.id}`]?.operadores ?? 0;
      operadoresAtuais += operadores;
      capacidadeTotalMes += operadores * horasEfetivasOperador;
      const fteMes = periodos.map((p) => {
        let h = 0;
        for (const sid of g.stageIds) h += porEtapaPeriodo[sid]?.[p] ?? 0;
        horasTotal += h;
        cargaPorPeriodo[p] = (cargaPorPeriodo[p] ?? 0) + h;
        return horasEfetivasOperador > 0 ? h / horasEfetivasOperador : 0;
      });
      fteMedio += fteMes.length > 0 ? fteMes.reduce((a, b) => a + b, 0) / fteMes.length : 0;
      ftePico += fteMes.length > 0 ? Math.max(...fteMes) : 0;
    }

    return {
      horasTotal,
      capacidadeTotal: capacidadeTotalMes * periodos.length,
      fteMedio,
      ftePico,
      operadoresAtuais,
      porPeriodo: periodos.map((p) => ({
        periodo: p,
        horas: cargaPorPeriodo[p] ?? 0,
        capacidade: capacidadeTotalMes,
      })),
    };
  }, [state, periodos, modelo]);
}
