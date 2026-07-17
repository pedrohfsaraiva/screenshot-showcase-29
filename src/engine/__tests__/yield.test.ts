import { describe, it, expect } from "vitest";
import { grossFromNet, rolledThroughputYield } from "../yield";

describe("grossFromNet", () => {
  it("aplica ceil quando output é discreto", () => {
    expect(grossFromNet(10, 0.9)).toBe(12); // 11.11 → 12
    expect(grossFromNet(100, 0.95)).toBe(106);
  });
  it("retorna igual quando yield = 1", () => {
    expect(grossFromNet(50, 1)).toBe(50);
  });
  it("rejeita yield zero", () => {
    expect(() => grossFromNet(10, 0)).toThrow();
  });
  it("rejeita yield > 1", () => {
    expect(() => grossFromNet(10, 1.2)).toThrow();
  });
  it("rejeita necessidade negativa", () => {
    expect(() => grossFromNet(-1, 0.9)).toThrow();
  });
  it("aceita net = 0 → 0", () => {
    expect(grossFromNet(0, 0.9)).toBe(0);
  });
});

describe("rolledThroughputYield", () => {
  it("produto das taxas", () => {
    const r = rolledThroughputYield([0.9, 0.95, 0.98]);
    expect(r).toBeCloseTo(0.9 * 0.95 * 0.98, 6);
  });
  it("retorna null se algum estágio provisório", () => {
    expect(rolledThroughputYield([0.9, null, 0.95])).toBeNull();
  });
});
