"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATEGORICAL,
  CHART_AXIS_PROPS,
  CHART_CHROME,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_STYLE,
} from "@/lib/colors";
import type { CategoriaPricingRow } from "./metrics";

interface Props {
  data: CategoriaPricingRow[];
}

const pctFormatter = (v: number) => `${(v * 100).toFixed(1)}%`;

/**
 * Duas séries por categoria, ambas em % (mesma escala, por isso cabem no
 * mesmo eixo Y sem precisar de eixo duplo):
 * - Desconto médio praticado nas vendas (preço de tabela → preço praticado)
 * - Posição média vs. concorrência (preço de tabela → preço concorrente)
 */
export function CategoriaPositionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey="categoria" {...CHART_AXIS_PROPS} interval={0} angle={-20} textAnchor="end" height={56} />
        <YAxis {...CHART_AXIS_PROPS} tickFormatter={pctFormatter} width={56} />
        <ReferenceLine y={0} stroke={CHART_CHROME.baseline} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value, name) => [pctFormatter(Number(value)), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="descontoMedioPct"
          name="Desconto médio praticado"
          fill={CATEGORICAL[0]}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="posicaoMediaPct"
          name="Posição vs. concorrência"
          fill={CATEGORICAL[1]}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
