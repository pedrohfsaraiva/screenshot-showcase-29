export const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "—";
  return brlFormatter.format(centavos / 100);
}

export const intFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return intFormatter.format(n);
}

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

/** Formata período YYYY-MM em "mmm/AA" pt-BR. */
export function formatPeriod(p: string): string {
  const [y, m] = p.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .replace(".", "");
}
