"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ACCENT,
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_STYLE,
} from "@/lib/colors";
import type { DailyPoint } from "./metrics";
import { formatBRL, formatDiaCurto } from "./format";

/**
 * Evolução diária de receita — série única, por isso usa a cor ACCENT da
 * seção (ver TASKS.md > Design System > Gráficos: "gráfico de 1 série usa
 * a cor ACCENT da própria seção").
 */
export function RevenueTrendChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...CHART_GRID_PROPS} />
          <XAxis
            dataKey="data"
            tickFormatter={formatDiaCurto}
            interval="preserveStartEnd"
            {...CHART_AXIS_PROPS}
          />
          <YAxis
            tickFormatter={(value: number) => formatBRL(value)}
            width={80}
            {...CHART_AXIS_PROPS}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelFormatter={(label) => formatDiaCurto(String(label))}
            formatter={(value) => [formatBRL(Number(value), 2), "Receita"]}
          />
          <Line
            type="monotone"
            dataKey="receita"
            name="Receita"
            stroke={ACCENT.vendas}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
