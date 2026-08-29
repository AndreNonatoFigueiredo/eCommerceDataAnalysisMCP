import type { ReactNode } from "react";

/**
 * Card de conteúdo (gráfico/tabela) da seção Clientes — mesma superfície e
 * borda do KpiCard (ver TASKS.md > Design System > Cards/KPI), mas sem a
 * barra de destaque, reservada aos KPIs numéricos.
 */
export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}
