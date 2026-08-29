"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import type { IntradayPoint } from "./metrics";

interface Props {
  points: IntradayPoint[];
  concorrentes: string[];
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * "Evolução" possível com os dados disponíveis: a coleta de preços de
 * concorrentes cobre um único dia-calendário, então a série mostra a
 * variação do preço médio coletado por concorrente ao longo das janelas
 * de horário daquele dia — não uma tendência de preço de longo prazo.
 */
export function CompetitorIntradayChart({ points, concorrentes }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey="bucket" {...CHART_AXIS_PROPS} />
        <YAxis {...CHART_AXIS_PROPS} tickFormatter={brl} width={72} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value, name) => [brl(Number(value)), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {concorrentes.map((nome, i) => (
          <Line
            key={nome}
            type="monotone"
            dataKey={nome}
            name={nome}
            stroke={CATEGORICAL[i % CATEGORICAL.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
