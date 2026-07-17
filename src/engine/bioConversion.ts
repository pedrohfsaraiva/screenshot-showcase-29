import type { ConversionMode } from "@/domain/types";

/**
 * Converte necessidade de unidades boas em pericárdios brutos segundo o modo.
 * - "pericardios_por_unidade_boa": raw = ceil(good * factor)
 * - "unidades_boas_por_pericardio": raw = ceil(good / factor)
 */
export function pericardioBruto(
  goodUnits: number,
  mode: ConversionMode,
  factor: number,
): number {
  if (!Number.isFinite(goodUnits) || goodUnits < 0) {
    throw new Error("Unidades boas inválidas");
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error("Fator de conversão deve ser > 0");
  }
  if (mode === "pericardios_por_unidade_boa") {
    return Math.ceil(goodUnits * factor);
  }
  return Math.ceil(goodUnits / factor);
}
