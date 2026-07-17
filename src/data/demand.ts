import type { DemandPeriod, ModelId } from "@/domain/types";

/** Gera 36 meses a partir de baseDate ISO YYYY-MM. */
export function generatePeriods(baseYearMonth: string, count = 36): string[] {
  const [y, m] = baseYearMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, (m - 1) + i, 1));
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

/** Demanda flat provisória — o usuário deve editar antes de "pronto para compra". */
export function seedDemand(periodos: string[]): DemandPeriod[] {
  const out: DemandPeriod[] = [];
  const modelos: ModelId[] = ["TR1P-45", "TR1P-55"];
  for (const modelId of modelos) {
    for (const p of periodos) {
      out.push({ modelId, periodo: p, demanda: 0 });
    }
  }
  return out;
}
