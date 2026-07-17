import { describe, it, expect } from "vitest";
import { runMrp, applyLotSizing } from "../mrp";

describe("applyLotSizing", () => {
  it("lot_for_lot devolve o exato", () => {
    expect(applyLotSizing(37, "lot_for_lot")).toBe(37);
  });
  it("aplica MOQ", () => {
    expect(applyLotSizing(5, "moq_multiplo", 50, 1)).toBe(50);
  });
  it("aplica múltiplo após MOQ", () => {
    expect(applyLotSizing(55, "moq_multiplo", 50, 25)).toBe(75);
  });
  it("lote fixo arredonda", () => {
    expect(applyLotSizing(220, "fixo", 0, 1, 100)).toBe(300);
  });
});

describe("runMrp", () => {
  const periodos = ["2026-01", "2026-02", "2026-03", "2026-04"];

  it("estoque suficiente gera necessidade líquida zero", () => {
    const rows = runMrp({
      periodos,
      demandaBruta: [10, 10, 10, 10],
      recebimentosProgramados: [0, 0, 0, 0],
      saldoInicial: 100,
      estoqueSeguranca: 0,
      leadTimePeriodos: 1,
      policy: "lot_for_lot",
    });
    expect(rows.every((r) => r.necessidadeLiquida === 0)).toBe(true);
  });

  it("lead time desloca liberação planejada", () => {
    const rows = runMrp({
      periodos,
      demandaBruta: [0, 0, 50, 0],
      recebimentosProgramados: [0, 0, 0, 0],
      saldoInicial: 0,
      estoqueSeguranca: 0,
      leadTimePeriodos: 2,
      policy: "lot_for_lot",
    });
    expect(rows[2].recebimentoPlanejado).toBe(50);
    expect(rows[0].liberacaoPlanejada).toBe(50);
  });

  it("MOQ e múltiplo aplicados após necessidade líquida", () => {
    const rows = runMrp({
      periodos: ["2026-01"],
      demandaBruta: [10],
      recebimentosProgramados: [0],
      saldoInicial: 0,
      estoqueSeguranca: 0,
      leadTimePeriodos: 0,
      policy: "moq_multiplo",
      moq: 100,
      multiplo: 25,
    });
    expect(rows[0].necessidadeLiquida).toBe(10);
    expect(rows[0].recebimentoPlanejado).toBe(100);
  });

  it("nunca retorna valores negativos em necessidade líquida", () => {
    const rows = runMrp({
      periodos,
      demandaBruta: [5, 5, 5, 5],
      recebimentosProgramados: [0, 0, 0, 0],
      saldoInicial: 1000,
      estoqueSeguranca: 0,
      leadTimePeriodos: 0,
      policy: "lot_for_lot",
    });
    expect(rows.every((r) => r.necessidadeLiquida >= 0)).toBe(true);
  });
});
