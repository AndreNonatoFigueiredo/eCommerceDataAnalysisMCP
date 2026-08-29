/** Helpers de formatação pt-BR usados só pela seção Vendas & Receita. */

export function formatBRL(value: number, fractionDigits = 0): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatInt(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function formatPercent(value: number, fractionDigits = 1): string {
  const sinal = value > 0 ? "+" : "";
  return `${sinal}${value.toFixed(fractionDigits).replace(".", ",")}%`;
}

/** Percentual absoluto (sem sinal de +/-) — para participações/shares, não deltas. */
export function formatShare(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits).replace(".", ",")}%`;
}

export function formatPontosPercentuais(value: number, fractionDigits = 1): string {
  const sinal = value > 0 ? "+" : "";
  return `${sinal}${value.toFixed(fractionDigits).replace(".", ",")} p.p.`;
}

/** "2025-12-13" -> "13/12" (rótulo compacto para eixo X). */
export function formatDiaCurto(isoDate: string): string {
  const [, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}`;
}
