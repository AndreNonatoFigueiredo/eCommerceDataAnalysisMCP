/**
 * Paleta de cores compartilhada para gráficos (Recharts) e UI.
 *
 * Fonte: paleta de dataviz validada (light mode). Ver dashboard/TASKS.md
 * seção "Design System" para o racional completo.
 *
 * Arquivo compartilhado — não editar sem coordenar com o time (mensagem
 * para "main"). Todos os especialistas devem IMPORTAR estas constantes em
 * vez de recriar cores nos próprios componentes, para manter consistência
 * visual entre as 3 seções.
 */

/** Cor de destaque de cada seção — também usada como "série 1" nos
 * gráficos daquela seção. */
export const ACCENT = {
  vendas: "#2a78d6", // azul
  pricing: "#eb6834", // laranja
  clientes: "#4a3aa7", // violeta
} as const;

/** Paleta categórica (ordem fixa, nunca ciclar/reordenar). Usar nesta
 * ordem para gráficos multi-série, começando sempre pelo slot 1.
 * Para gráficos com mais de 3 séries em scatter/bubble/small multiples,
 * limitar aos 3 primeiros slots (blue/orange/aqua) e agrupar o resto em
 * "Outros" — ver skill de dataviz. */
export const CATEGORICAL = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

/** Cores de status fixas — nunca reaproveitar para identificar séries.
 * Sempre acompanhar de ícone + label, nunca cor isolada. */
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

/** Cromo de gráfico (superfície, grid, eixos, texto). */
export const CHART_CHROME = {
  surface: "#fcfcfb",
  pagePlane: "#f9f9f7",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  textMuted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
} as const;

/** Estilo padrão do <Tooltip /> do Recharts — espalhar em contentStyle. */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #e1e0d9",
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(11,11,11,0.08)",
  fontSize: 13,
  color: CHART_CHROME.textPrimary,
} as const;

/** Props padrão do <CartesianGrid /> do Recharts. */
export const CHART_GRID_PROPS = {
  stroke: CHART_CHROME.gridline,
  strokeDasharray: "3 3",
  vertical: false,
} as const;

/** Props padrão de eixos (<XAxis />/<YAxis />) do Recharts. */
export const CHART_AXIS_PROPS = {
  stroke: CHART_CHROME.baseline,
  tick: { fill: CHART_CHROME.textMuted, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: CHART_CHROME.baseline },
} as const;
