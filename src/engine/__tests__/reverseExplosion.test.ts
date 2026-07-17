import { describe, it, expect } from "vitest";
import { reverseExplode } from "../reverseExplosion";
import type { ProcessStage, YieldParameter } from "@/domain/types";

const src = {
  documento: "TEST",
  status: "aprovado" as const,
};

function stage(id: string, ordem: number, ativo = true): ProcessStage {
  return {
    id,
    ordem,
    nome: id,
    tipo: "processo",
    yieldId: id,
    leadTimeDias: 1,
    retrabalhoPermitido: true,
    ativo,
    source: src,
  };
}

function yv(stageId: string, valor: number | null): YieldParameter {
  return { id: stageId, stageId, valor, tipoPerda: "sucata", source: src };
}

describe("reverseExplode", () => {
  it("multiplica necessidade pela cadeia de yields (arredondando)", () => {
    const stages = [stage("A", 1), stage("B", 2), stage("C", 3)];
    const yields = [yv("A", 0.9), yv("B", 0.95), yv("C", 0.98)];
    const result = reverseExplode(100, stages, yields);
    // C: 100/0.98 = 103; B: 103/0.95 = 109; A: 109/0.9 = 122
    expect(result.reconciliacao).toHaveLength(3);
    expect(result.necessidadeInicial).toBe(122);
    expect(result.temProvisorio).toBe(false);
  });

  it("marca provisório quando yield é null e trata como 1", () => {
    const stages = [stage("A", 1), stage("B", 2)];
    const yields = [yv("A", 0.9), yv("B", null)];
    const result = reverseExplode(100, stages, yields);
    expect(result.temProvisorio).toBe(true);
    expect(result.reconciliacao[1].provisorio).toBe(true);
    // B tratado como 1 → 100; A: 100/0.9 = 112
    expect(result.necessidadeInicial).toBe(112);
  });

  it("ignora etapas inativas", () => {
    const stages = [stage("A", 1), stage("B", 2, false), stage("C", 3)];
    const yields = [yv("A", 0.9), yv("B", 0.5), yv("C", 0.9)];
    const result = reverseExplode(100, stages, yields);
    expect(result.reconciliacao).toHaveLength(2);
    expect(result.reconciliacao.map((r) => r.stageId)).toEqual(["A", "C"]);
  });
});
