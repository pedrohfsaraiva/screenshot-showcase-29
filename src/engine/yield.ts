// Puro: cálculo de necessidade bruta a partir da líquida com yield.

/**
 * Retorna a necessidade bruta (entrada) para produzir `net` unidades boas
 * dada uma taxa de aprovação `yieldRate` em (0, 1].
 * Arredonda para cima quando o output é discreto (default true).
 */
export function grossFromNet(
  net: number,
  yieldRate: number,
  discrete = true,
): number {
  if (!Number.isFinite(net) || net < 0) {
    throw new Error("Necessidade inválida");
  }
  if (!Number.isFinite(yieldRate) || yieldRate <= 0 || yieldRate > 1) {
    throw new Error("Yield deve estar entre 0 (exclusivo) e 1 (inclusivo)");
  }
  const raw = net / yieldRate;
  return discrete ? Math.ceil(raw) : raw;
}

/**
 * Rolled Throughput Yield (RTY) — produto das taxas de cada gate.
 * Retorna null se qualquer taxa for null (DADO A CONFIRMAR).
 */
export function rolledThroughputYield(rates: Array<number | null>): number | null {
  let acc = 1;
  for (const r of rates) {
    if (r === null || r === undefined) return null;
    if (!Number.isFinite(r) || r <= 0 || r > 1) {
      throw new Error("Yield fora do intervalo (0,1]");
    }
    acc *= r;
  }
  return acc;
}
