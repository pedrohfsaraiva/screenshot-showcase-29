// MRP líquida por período (mensal). Puro, sem I/O.

import type { LotSizingPolicy } from "@/domain/types";

export interface MrpInput {
  periodos: string[]; // ISO YYYY-MM em ordem
  demandaBruta: number[]; // por período
  recebimentosProgramados: number[];
  saldoInicial: number;
  estoqueSeguranca: number;
  leadTimePeriodos: number;
  policy: LotSizingPolicy;
  loteFixo?: number;
  moq?: number;
  multiplo?: number;
}

export interface MrpRow {
  periodo: string;
  demandaBruta: number;
  recebimentosProgramados: number;
  disponivelProjetado: number;
  necessidadeLiquida: number;
  recebimentoPlanejado: number;
  liberacaoPlanejada: number;
  excecoes: string[];
}

export function applyLotSizing(
  net: number,
  policy: LotSizingPolicy,
  moq = 0,
  mult = 1,
  fixo = 0,
): number {
  if (net <= 0) return 0;
  if (policy === "lot_for_lot") return net;
  if (policy === "fixo") {
    if (fixo <= 0) return net;
    return Math.ceil(net / fixo) * fixo;
  }
  // moq_multiplo
  let q = Math.max(net, moq);
  if (mult > 1) q = Math.ceil(q / mult) * mult;
  return q;
}

export function runMrp(input: MrpInput): MrpRow[] {
  const n = input.periodos.length;
  const rows: MrpRow[] = [];
  const liberacoes = new Array<number>(n).fill(0);

  let disponivelAnterior = input.saldoInicial;

  for (let t = 0; t < n; t++) {
    const bruta = input.demandaBruta[t] ?? 0;
    const rec = input.recebimentosProgramados[t] ?? 0;

    const antesDoPlanejado = disponivelAnterior + rec - bruta;
    const netReq = Math.max(0, input.estoqueSeguranca - antesDoPlanejado);
    const planejado = applyLotSizing(
      netReq,
      input.policy,
      input.moq ?? 0,
      input.multiplo ?? 1,
      input.loteFixo ?? 0,
    );

    const disponivel = antesDoPlanejado + planejado;
    const releaseT = t - input.leadTimePeriodos;
    const excecoes: string[] = [];
    if (planejado > 0 && releaseT < 0) {
      excecoes.push("Liberação necessária antes do horizonte");
    } else if (planejado > 0) {
      liberacoes[releaseT] += planejado;
    }
    if (disponivel < 0) excecoes.push("Estoque projetado negativo");

    rows.push({
      periodo: input.periodos[t],
      demandaBruta: bruta,
      recebimentosProgramados: rec,
      disponivelProjetado: disponivel,
      necessidadeLiquida: netReq,
      recebimentoPlanejado: planejado,
      liberacaoPlanejada: 0, // preenchido abaixo
      excecoes,
    });
    disponivelAnterior = disponivel;
  }

  for (let t = 0; t < n; t++) {
    rows[t].liberacaoPlanejada = liberacoes[t];
  }
  return rows;
}
