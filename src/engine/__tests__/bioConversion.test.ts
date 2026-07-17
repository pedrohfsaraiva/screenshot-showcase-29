import { describe, it, expect } from "vitest";
import { pericardioBruto } from "../bioConversion";

describe("pericardioBruto", () => {
  it("modo pericardios_por_unidade_boa", () => {
    // 100 folhetos aprovados * fator 7 → 700 pericárdios
    expect(pericardioBruto(100, "pericardios_por_unidade_boa", 7)).toBe(700);
  });
  it("modo unidades_boas_por_pericardio arredonda para cima", () => {
    expect(pericardioBruto(10, "unidades_boas_por_pericardio", 3)).toBe(4);
  });
  it("rejeita fator zero", () => {
    expect(() => pericardioBruto(10, "pericardios_por_unidade_boa", 0)).toThrow();
  });
});
