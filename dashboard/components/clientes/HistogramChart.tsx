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
import type { BucketCount } from "./metrics";

/**
 * Histograma genérico de "nº de clientes por faixa" — usado tanto para
 * recência (dias desde a última compra) quanto para frequência de compra
 * (nº de vendas). Série única, cor de destaque da seção Clientes.
 */
export function HistogramChart({
  data,
  tooltipLabel,
}: {
  data: BucketCount[];
  tooltipLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey="label" {...CHART_AXIS_PROPS} />
        <YAxis allowDecimals={false} {...CHART_AXIS_PROPS} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value) => [`${value}`, tooltipLabel]}
        />
        <Bar dataKey="clientes" fill={ACCENT.clientes} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
