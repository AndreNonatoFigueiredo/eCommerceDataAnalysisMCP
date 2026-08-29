import type { ProdutoRow, VendaRow } from "./data";

/**
 * Agregações da seção Vendas & Receita — funções puras (sem I/O), chamadas
 * pelo Server Component `app/vendas/page.tsx` sobre as linhas já buscadas
 * do Supabase. Ver TASKS.md > "Vendas & Receita" para o racional das
 * decisões de tratamento de dados citadas nos comentários abaixo.
 *
 * Janela de dados observada em produção: `vendas.data_venda` cobre apenas
 * ~30 dias corridos (13/12/2025 a 11/01/2026), atravessando a virada do
 * mês. Por isso a evolução temporal é construída por DIA (não por mês —
 * agrupar por mês daria só 2 pontos, ambos parciais, o que contaria uma
 * história enganosa de "queda" entre dezembro e janeiro).
 */

/** Valor de uma linha de venda — não existe coluna de total pronta. */
export function valorLinha(v: Pick<VendaRow, "quantidade" | "preco_unitario">): number {
  return v.quantidade * v.preco_unitario;
}

/**
 * Marcador dos 20 produtos placeholder ("Produto Descontinuado", vindos de
 * vendas órfãs — ver TASKS.md). Tratamento adotado nesta seção:
 *  - MANTIDOS no cálculo de Receita Total, Nº de Pedidos, Ticket Médio,
 *    Receita por Canal e na série temporal — são vendas reais que
 *    aconteceram, só o cadastro do produto associado é que se perdeu.
 *  - EXCLUÍDOS do ranking de Top Produtos, pois esse ranking existe para
 *    dizer "qual produto vender mais/menos" e um placeholder sem nome real
 *    não é uma decisão acionável.
 */
const PRODUTO_PLACEHOLDER_CATEGORIA = "Desconhecida";

export function isProdutoPlaceholder(p: Pick<ProdutoRow, "categoria">): boolean {
  return p.categoria === PRODUTO_PLACEHOLDER_CATEGORIA;
}

// ---------------------------------------------------------------------------
// KPIs de topo
// ---------------------------------------------------------------------------

export interface KpiSummary {
  receitaTotal: number;
  numeroPedidos: number;
  ticketMedio: number;
  numeroDiasComVenda: number;
}

/**
 * - Receita Total = SUM(quantidade * preco_unitario) sobre todas as vendas.
 * - Nº de Pedidos = COUNT(id_venda) — `id_venda` é PK de `vendas` (uma
 *   linha = uma venda/pedido atômico; o schema não tem conceito de
 *   "pedido com múltiplos itens"), logo COUNT(*) = COUNT(DISTINCT id_venda).
 * - Ticket Médio = Receita Total / Nº de Pedidos.
 */
export function computeKpiSummary(vendas: VendaRow[]): KpiSummary {
  const receitaTotal = vendas.reduce((acc, v) => acc + valorLinha(v), 0);
  const numeroPedidos = vendas.length;
  const ticketMedio = numeroPedidos > 0 ? receitaTotal / numeroPedidos : 0;
  const numeroDiasComVenda = new Set(vendas.map((v) => diaISO(v.data_venda))).size;

  return { receitaTotal, numeroPedidos, ticketMedio, numeroDiasComVenda };
}

function diaISO(dataVenda: string): string {
  return dataVenda.slice(0, 10); // "YYYY-MM-DD" (UTC, como retornado pelo Postgres)
}

// ---------------------------------------------------------------------------
// Comparação 1ª vs 2ª metade do período (usada nos deltas dos KpiCards)
// ---------------------------------------------------------------------------
//
// Não existe um período anterior completo para comparar mês a mês (os
// dados começam do zero em 13/12/2025). Para ainda assim dar um sinal de
// tendência nos KpiCards, comparamos a 2ª metade dos dias com venda contra
// a 1ª metade — ex: "2ª quinzena vs. 1ª quinzena do período disponível".

export interface HalfSplit {
  primeira: VendaRow[];
  segunda: VendaRow[];
}

export function splitByHalves(vendas: VendaRow[]): HalfSplit {
  const dias = Array.from(new Set(vendas.map((v) => diaISO(v.data_venda)))).sort();
  const meio = Math.ceil(dias.length / 2);
  const corte = dias[meio]; // primeiro dia da 2ª metade

  if (!corte) {
    return { primeira: vendas, segunda: [] };
  }

  const primeira = vendas.filter((v) => diaISO(v.data_venda) < corte);
  const segunda = vendas.filter((v) => diaISO(v.data_venda) >= corte);
  return { primeira, segunda };
}

export type Trend = "up" | "down" | "neutral";

export interface Variacao {
  percentual: number | null;
  trend: Trend;
}

/** Variação percentual de `atual` vs. `base`. `null` se `base` for 0. */
export function variacaoPercentual(atual: number, base: number): Variacao {
  if (base === 0) return { percentual: null, trend: "neutral" };
  const percentual = ((atual - base) / base) * 100;
  const trend: Trend = percentual > 0.05 ? "up" : percentual < -0.05 ? "down" : "neutral";
  return { percentual, trend };
}

// ---------------------------------------------------------------------------
// Evolução diária de receita
// ---------------------------------------------------------------------------

export interface DailyPoint {
  data: string; // "YYYY-MM-DD"
  receita: number;
  pedidos: number;
}

export function computeDailySeries(vendas: VendaRow[]): DailyPoint[] {
  const map = new Map<string, { receita: number; pedidos: number }>();

  for (const v of vendas) {
    const dia = diaISO(v.data_venda);
    const atual = map.get(dia) ?? { receita: 0, pedidos: 0 };
    atual.receita += valorLinha(v);
    atual.pedidos += 1;
    map.set(dia, atual);
  }

  return Array.from(map.entries())
    .map(([data, agg]) => ({ data, ...agg }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

// ---------------------------------------------------------------------------
// Receita por canal de venda
// ---------------------------------------------------------------------------

export interface ChannelRevenue {
  canal: string;
  label: string;
  receita: number;
  pedidos: number;
  participacao: number; // 0-1, fração da receita total
}

const CHANNEL_LABELS: Record<string, string> = {
  ecommerce: "E-commerce",
  loja_fisica: "Loja Física",
};

/** Receita por Canal = GROUP BY canal_venda, SUM(quantidade*preco_unitario). */
export function computeRevenueByChannel(vendas: VendaRow[]): ChannelRevenue[] {
  const map = new Map<string, { receita: number; pedidos: number }>();
  const receitaTotal = vendas.reduce((acc, v) => acc + valorLinha(v), 0);

  for (const v of vendas) {
    const atual = map.get(v.canal_venda) ?? { receita: 0, pedidos: 0 };
    atual.receita += valorLinha(v);
    atual.pedidos += 1;
    map.set(v.canal_venda, atual);
  }

  return Array.from(map.entries())
    .map(([canal, agg]) => ({
      canal,
      label: CHANNEL_LABELS[canal] ?? canal,
      participacao: receitaTotal > 0 ? agg.receita / receitaTotal : 0,
      ...agg,
    }))
    .sort((a, b) => b.receita - a.receita);
}

/**
 * Participação do canal líder no total de receita, com variação em pontos
 * percentuais entre a 1ª e a 2ª metade do período — mostra se o canal
 * dominante está ganhando ou perdendo espaço.
 */
export function computeLeadingChannelShareTrend(vendas: VendaRow[]) {
  const porCanal = computeRevenueByChannel(vendas);
  const lider = porCanal[0];
  if (!lider) return null;

  const shareNoRecorte = (subset: VendaRow[]) => {
    const total = subset.reduce((acc, v) => acc + valorLinha(v), 0);
    if (total === 0) return 0;
    const doLider = subset
      .filter((v) => v.canal_venda === lider.canal)
      .reduce((acc, v) => acc + valorLinha(v), 0);
    return doLider / total;
  };

  const { primeira, segunda } = splitByHalves(vendas);
  const deltaPontosPercentuais = (shareNoRecorte(segunda) - shareNoRecorte(primeira)) * 100;

  return {
    label: lider.label,
    participacao: lider.participacao,
    deltaPontosPercentuais,
  };
}

// ---------------------------------------------------------------------------
// Sazonalidade por dia da semana
// ---------------------------------------------------------------------------

export interface WeekdayRevenue {
  dow: number; // 0 = domingo ... 6 = sábado (getUTCDay)
  label: string;
  receita: number;
  pedidos: number;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Receita agrupada por dia da semana (UTC) — evidencia sazonalidade intrassemanal. */
export function computeRevenueByWeekday(vendas: VendaRow[]): WeekdayRevenue[] {
  const totals = Array.from({ length: 7 }, () => ({ receita: 0, pedidos: 0 }));

  for (const v of vendas) {
    const dow = new Date(v.data_venda).getUTCDay();
    totals[dow].receita += valorLinha(v);
    totals[dow].pedidos += 1;
  }

  return totals.map((agg, dow) => ({ dow, label: WEEKDAY_LABELS[dow], ...agg }));
}

// ---------------------------------------------------------------------------
// Top produtos por receita
// ---------------------------------------------------------------------------

export interface ProductRevenue {
  id_produto: string;
  nome: string;
  categoria: string;
  marca: string;
  quantidade: number;
  pedidos: number;
  receita: number;
}

/**
 * Ranking de produtos por receita — EXCLUI os 20 placeholders
 * "Produto Descontinuado" (ver `isProdutoPlaceholder` acima).
 */
export function computeTopProdutos(
  vendas: VendaRow[],
  produtos: ProdutoRow[],
  limit = 10
): ProductRevenue[] {
  const produtoPorId = new Map(produtos.map((p) => [p.id_produto, p]));
  const map = new Map<string, { quantidade: number; pedidos: number; receita: number }>();

  for (const v of vendas) {
    const produto = produtoPorId.get(v.id_produto);
    if (!produto || isProdutoPlaceholder(produto)) continue;

    const atual = map.get(v.id_produto) ?? { quantidade: 0, pedidos: 0, receita: 0 };
    atual.quantidade += v.quantidade;
    atual.pedidos += 1;
    atual.receita += valorLinha(v);
    map.set(v.id_produto, atual);
  }

  return Array.from(map.entries())
    .map(([id_produto, agg]) => {
      const produto = produtoPorId.get(id_produto)!;
      return {
        id_produto,
        nome: produto.nome_produto,
        categoria: produto.categoria,
        marca: produto.marca,
        ...agg,
      };
    })
    .sort((a, b) => b.receita - a.receita)
    .slice(0, limit);
}
