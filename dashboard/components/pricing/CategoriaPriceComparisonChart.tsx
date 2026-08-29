"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATEGORICAL,
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_STYLE,
} from "@/lib/colors";
import type { CategoriaPricingRow } from "./metrics";

interface Props {
  data: CategoriaPricingRow[];
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Preço próprio médio vs. preço médio da concorrência, em R$, por categoria. */
export function CategoriaPriceComparisonChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey="categoria" {...CHART_AXIS_PROPS} interval={0} angle={-20} textAnchor="end" height={56} />
        <YAxis {...CHART_AXIS_PROPS} tickFormatter={brl} width={72} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value, name) => [brl(Number(value)), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="precoProprioMedio"
          name="Preço próprio (tabela)"
          fill={CATEGORICAL[0]}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="precoConcorrenteMedio"
          name="Preço médio da concorrência"
          fill={CATEGORICAL[1]}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
