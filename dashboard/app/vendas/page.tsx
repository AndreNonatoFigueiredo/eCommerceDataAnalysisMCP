import { KpiCard } from "@/components/ui/KpiCard";
import { ACCENT } from "@/lib/colors";
import { fetchVendasEProdutos } from "@/components/vendas/data";
import {
  computeDailySeries,
  computeKpiSummary,
  computeLeadingChannelShareTrend,
  computeRevenueByChannel,
  computeRevenueByWeekday,
  computeTopProdutos,
  splitByHalves,
  valorLinha,
  variacaoPercentual,
} from "@/components/vendas/metrics";
import {
  formatBRL,
  formatInt,
  formatPercent,
  formatPontosPercentuais,
  formatShare,
} from "@/components/vendas/format";
import { RevenueTrendChart } from "@/components/vendas/RevenueTrendChart";
import { RevenueByChannelChart } from "@/components/vendas/RevenueByChannelChart";
import { RevenueByWeekdayChart } from "@/components/vendas/RevenueByWeekdayChart";
import { TopProductsTable } from "@/components/vendas/TopProductsTable";

/**
 * Seção Vendas & Receita — dono: Teammate Vendas.
 *
 * Server Component: busca `vendas` (paginado) e `produtos` no servidor via
 * `@/lib/supabase` e agrega tudo em memória (ver components/vendas/data.ts
 * e components/vendas/metrics.ts) — nenhuma lógica de agregação roda no
 * client, só a renderização dos gráficos Recharts.
 *
 * KPIs definidos (fórmula e fonte — ver também TASKS.md):
 *   1. Receita Total = SUM(vendas.quantidade * vendas.preco_unitario), todas as vendas.
 *   2. Nº de Pedidos = COUNT(vendas.id_venda) (cada linha já é uma venda atômica).
 *   3. Ticket Médio = Receita Total / Nº de Pedidos.
 *   4. Participação do canal líder = SUM(receita do canal) / SUM(receita total),
 *      GROUP BY vendas.canal_venda — complementa o gráfico de receita por canal.
 *   5. Evolução diária de receita = SUM(receita) GROUP BY date_trunc('day', data_venda)
 *      — por dia, não por mês: os dados cobrem só ~30 dias corridos (13/12/2025 a
 *      11/01/2026), então uma quebra mensal geraria 2 pontos parciais e enganosos.
 *   6. Receita por dia da semana = SUM(receita) GROUP BY extract(dow from data_venda)
 *      — usada para investigar sazonalidade intrassemanal.
 *   7. Top Produtos por Receita = SUM(receita) GROUP BY id_produto, join em `produtos`
 *      para nome/categoria/marca, ORDER BY receita DESC LIMIT 10.
 *
 * Tratamento dos 20 produtos placeholder ("Produto Descontinuado", vindos de
 * vendas órfãs): mantidos nos KPIs de topo, na série temporal e na receita
 * por canal (são vendas reais), mas EXCLUÍDOS do ranking de Top Produtos
 * (ver `isProdutoPlaceholder` em components/vendas/metrics.ts) — o impacto
 * é marginal (20 vendas de ~3020, ~R$ 4,2 mil de ~R$ 974 mil de receita).
 *
 * Comparações de tendência (deltas dos KpiCards): não há um período
 * anterior completo nos dados para comparar mês a mês, então os deltas
 * comparam a 2ª metade dos dias com venda contra a 1ª metade do próprio
 * período disponível (ver `splitByHalves`).
 */
export default async function VendasPage() {
  const { vendas, produtos } = await fetchVendasEProdutos();

  const kpis = computeKpiSummary(vendas);
  const { primeira, segunda } = splitByHalves(vendas);

  const receitaPrimeira = primeira.reduce((acc, v) => acc + valorLinha(v), 0);
  const receitaSegunda = segunda.reduce((acc, v) => acc + valorLinha(v), 0);
  const receitaDelta = variacaoPercentual(receitaSegunda, receitaPrimeira);

  const pedidosDelta = variacaoPercentual(segunda.length, primeira.length);

  const ticketPrimeira = primeira.length > 0 ? receitaPrimeira / primeira.length : 0;
  const ticketSegunda = segunda.length > 0 ? receitaSegunda / segunda.length : 0;
  const ticketDelta = variacaoPercentual(ticketSegunda, ticketPrimeira);

  const canalLiderTrend = computeLeadingChannelShareTrend(vendas);

  const dailySeries = computeDailySeries(vendas);
  const revenueByChannel = computeRevenueByChannel(vendas);
  const revenueByWeekday = computeRevenueByWeekday(vendas);
  const topProdutos = computeTopProdutos(vendas, produtos, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Vendas & Receita</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Como a receita evoluiu dia a dia, quais canais performam melhor e quais
          produtos mais vendem — {formatInt(kpis.numeroPedidos)} vendas registradas em{" "}
          {formatInt(kpis.numeroDiasComVenda)} dias, entre {dailySeries[0]?.data.split("-").reverse().join("/")}{" "}
          e {dailySeries[dailySeries.length - 1]?.data.split("-").reverse().join("/")}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Receita Total"
          value={formatBRL(kpis.receitaTotal)}
          delta={
            receitaDelta.percentual !== null
              ? `${formatPercent(receitaDelta.percentual)} na 2ª metade vs. 1ª metade do período`
              : undefined
          }
          trend={receitaDelta.trend}
          accent={ACCENT.vendas}
        />
        <KpiCard
          label="Número de Pedidos"
          value={formatInt(kpis.numeroPedidos)}
          delta={
            pedidosDelta.percentual !== null
              ? `${formatPercent(pedidosDelta.percentual)} na 2ª metade vs. 1ª metade do período`
              : undefined
          }
          trend={pedidosDelta.trend}
          accent={ACCENT.vendas}
        />
        <KpiCard
          label="Ticket Médio"
          value={formatBRL(kpis.ticketMedio, 2)}
          delta={
            ticketDelta.percentual !== null
              ? `${formatPercent(ticketDelta.percentual)} na 2ª metade vs. 1ª metade do período`
              : undefined
          }
          trend={ticketDelta.trend}
          accent={ACCENT.vendas}
        />
        <KpiCard
          label={`Participação — ${canalLiderTrend?.label ?? "canal líder"}`}
          value={canalLiderTrend ? formatShare(canalLiderTrend.participacao * 100) : "—"}
          delta={
            canalLiderTrend
              ? `${formatPontosPercentuais(canalLiderTrend.deltaPontosPercentuais)} de participação vs. 1ª metade`
              : undefined
          }
          trend={
            canalLiderTrend
              ? canalLiderTrend.deltaPontosPercentuais >= 0.05
                ? "up"
                : canalLiderTrend.deltaPontosPercentuais <= -0.05
                  ? "down"
                  : "neutral"
              : "neutral"
          }
          accent={ACCENT.vendas}
        />
      </div>

      <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Evolução diária da receita</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Receita somada por dia (todas as vendas, incluindo as 20 vendas de produtos
          sem cadastro válido — ver nota de qualidade de dados abaixo).
        </p>
        <div className="mt-4">
          <RevenueTrendChart data={dailySeries} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Receita por canal de venda</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {revenueByChannel
              .map((c) => `${c.label}: ${formatShare(c.participacao * 100)}`)
              .join(" · ")}
          </p>
          <div className="mt-4">
            <RevenueByChannelChart data={revenueByChannel} />
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Sazonalidade por dia da semana</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Receita somada por dia da semana ao longo de todo o período — ajuda a
            identificar se há dias mais fortes de venda.
          </p>
          <div className="mt-4">
            <RevenueByWeekdayChart data={revenueByWeekday} />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Top 10 produtos por receita</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Exclui os 20 produtos placeholder (&quot;Produto Descontinuado&quot;) vindos de
          vendas órfãs — eles continuam contabilizados na Receita Total, mas não fazem
          sentido em um ranking de produto.
        </p>
        <div className="mt-4">
          <TopProductsTable data={topProdutos} />
        </div>
      </section>

      <p className="text-xs text-text-muted">
        Nota de qualidade de dados: 20 das {formatInt(produtos.length)} linhas de
        `produtos` são placeholders (&quot;Produto Descontinuado&quot; / categoria e marca
        &quot;Desconhecida&quot;) criados a partir de vendas que referenciam produtos sem
        cadastro. Essas vendas somam cerca de R$ 4,2 mil e permanecem nos KPIs de
        receita/pedidos/canal/série temporal, mas são excluídas do ranking de Top
        Produtos por não serem acionáveis.
      </p>
    </div>
  );
}
