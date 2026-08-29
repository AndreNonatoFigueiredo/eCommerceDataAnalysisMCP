import type { ReactNode } from "react";

type Trend = "up" | "down" | "neutral";

export interface KpiCardProps {
  /** Label curto do KPI, ex: "Receita Total" */
  label: string;
  /** Valor principal já formatado, ex: "R$ 128.430" */
  value: string;
  /** Variação percentual/textual opcional, ex: "+4,2% vs. mês anterior" */
  delta?: string;
  /** Direção da variação — controla a cor (good/critical) e a seta. */
  trend?: Trend;
  /** Cor de destaque da seção (ACCENT.vendas | ACCENT.pricing | ACCENT.clientes),
   * usada como barra/indicador sutil no card. */
  accent?: string;
  /** Conteúdo extra opcional (ex: sparkline) renderizado abaixo do valor. */
  children?: ReactNode;
}

/**
 * Card de KPI padrão do dashboard — usar em todas as seções para manter
 * consistência visual. Ver dashboard/TASKS.md > "Design System" > "Cards/KPI".
 *
 * Arquivo compartilhado — não editar sem coordenar com o time (mensagem
 * para "main"). Se precisar de uma variação, prefira compor em volta deste
 * componente na sua própria pasta components/<secao>/ em vez de alterá-lo.
 */
export function KpiCard({
  label,
  value,
  delta,
  trend = "neutral",
  accent,
  children,
}: KpiCardProps) {
  const trendColor =
    trend === "up"
      ? "text-[#0ca30c]"
      : trend === "down"
        ? "text-[#d03b3b]"
        : "text-text-muted";

  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <p className="tabular-nums mt-2 text-3xl font-bold text-foreground">
        {value}
      </p>
      {delta ? (
        <p className={`mt-1 text-sm font-medium ${trendColor}`}>
          {trendArrow} {delta}
        </p>
      ) : null}
      {children}
    </div>
  );
}
