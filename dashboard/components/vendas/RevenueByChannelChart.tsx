"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ACCENT, CHART_AXIS_PROPS, CHART_GRID_PROPS, CHART_TOOLTIP_STYLE } from "@/lib/colors";
import type { ChannelRevenue } from "./metrics";
import { formatBRL } from "./format";

/**
 * Receita por canal de venda — uma única métrica (receita) quebrada pelas
 * categorias do eixo X (canais), não múltiplas séries: por isso todas as
 * barras usam a cor ACCENT da seção, sem legenda (ver regra de gráfico de
 * série única no design system).
 */
export function RevenueByChannelChart({ data }: { data: ChannelRevenue[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis dataKey="label" {...CHART_AXIS_PROPS} />
          <YAxis tickFormatter={(value: number) => formatBRL(value)} width={80} {...CHART_AXIS_PROPS} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            formatter={(value) => [formatBRL(Number(value), 2), "Receita"]}
          />
          <Bar dataKey="receita" name="Receita" fill={ACCENT.vendas} radius={[4, 4, 0, 0]} maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
