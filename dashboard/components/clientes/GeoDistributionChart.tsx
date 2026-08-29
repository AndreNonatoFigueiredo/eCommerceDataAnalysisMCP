"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import type { GeoBucket } from "./metrics";

/**
 * Distribuição geográfica de clientes por estado (série única — usa
 * ACCENT.clientes). Layout horizontal: com 22 estados, barras horizontais
 * com o estado no eixo Y leem melhor do que rótulos rotacionados no eixo X.
 */
export function GeoDistributionChart({ data }: { data: GeoBucket[] }) {
  const height = Math.max(240, data.length * 26);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        barCategoryGap={6}
      >
        <CartesianGrid {...CHART_GRID_PROPS} horizontal={false} vertical />
        <XAxis type="number" allowDecimals={false} {...CHART_AXIS_PROPS} />
        <YAxis
          type="category"
          dataKey="estado"
          width={40}
          {...CHART_AXIS_PROPS}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value) => [`${value}`, "Clientes"]}
          labelFormatter={(label) => `Estado: ${label}`}
        />
        <Bar dataKey="clientes" fill={ACCENT.clientes} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
