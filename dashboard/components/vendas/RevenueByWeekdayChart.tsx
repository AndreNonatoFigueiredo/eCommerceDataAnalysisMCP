"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ACCENT, CHART_AXIS_PROPS, CHART_GRID_PROPS, CHART_TOOLTIP_STYLE } from "@/lib/colors";
import type { WeekdayRevenue } from "./metrics";
import { formatBRL } from "./format";

/**
 * Receita por dia da semana — evidencia sazonalidade intrassemanal (série
 * única, cor ACCENT da seção, sem legenda).
 */
export function RevenueByWeekdayChart({ data }: { data: WeekdayRevenue[] }) {
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
          <Bar dataKey="receita" name="Receita" fill={ACCENT.vendas} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
