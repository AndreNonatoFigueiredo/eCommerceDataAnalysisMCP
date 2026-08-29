import { KpiCard } from "@/components/ui/KpiCard";
import { ACCENT } from "@/lib/colors";
import { fetchPricingDataset } from "@/components/pricing/data";
import {
  computeCategoriaPricing,
  computeIntradayCompetitorSeries,
  computePricingKpis,
  computeProdutoRanking,
} from "@/components/pricing/metrics";
import { CategoriaPositionChart } from "@/components/pricing/CategoriaPositionChart";
import { CategoriaPriceComparisonChart } from "@/components/pricing/CategoriaPriceComparisonChart";
import { CompetitorIntradayChart } from "@/components/pricing/CompetitorIntradayChart";
import { ProdutoRankingTable } from "@/components/pricing/ProdutoRankingTable";
import { MethodologyNote } from "@/components/pricing/MethodologyNote";

const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
const pctAbs = (v: number) => `${(v * 100).toFixed(1)}%`;

/**
 * Seção Pricing & Margem — dono: Teammate Pricing.
 *
 * Server Component: busca as 3 tabelas relevantes no servidor (via
 * `fetchPricingDataset`) e agrega tudo em memória (ver
 * `components/pricing/data.ts`) — os volumes são pequenos o suficiente
 * (235 produtos, 728 registros de concorrência, ~3000 vendas válidas) para
 * não precisar de agregação no banco.
 *
 * Narrativa: estamos competitivos? em quais categorias estamos caros ou
 * baratos frente à concorrência? como o desconto praticado varia por
 * categoria? quais produtos específicos mais se destacam nessa comparação?
 */
export default async function PricingPage() {
  const dataset = await fetchPricingDataset();

  const kpis = computePricingKpis(dataset);
  const categorias = computeCategoriaPricing(dataset);
  const { points: intradayPoints, concorrentes } = computeIntradayCompetitorSeries(dataset);
  const ranking = computeProdutoRanking(dataset, 8);

  const categoriaMaisCara = categorias[0];
  const categoriaMaisBarata = categorias[categorias.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Pricing & Margem
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Estamos competitivos? Em quais categorias praticamos preços acima ou
          abaixo da concorrência, e como o desconto varia entre elas.
        </p>
      </div>

      <MethodologyNote />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Desconto Médio Praticado"
          value={pctAbs(kpis.descontoMedioPct)}
          delta={`sobre ${kpis.nVendasConsideradas.toLocaleString("pt-BR")} vendas de produtos válidos`}
          accent={ACCENT.pricing}
        />
        <KpiCard
          label="Posição Média vs. Concorrência"
          value={pct(kpis.posicaoMediaPct)}
          delta={
            kpis.posicaoMediaPct >= 0
              ? "em média, acima do preço da concorrência"
              : "em média, abaixo do preço da concorrência"
          }
          accent={ACCENT.pricing}
        />
        <KpiCard
          label="Produtos Acima do Mercado"
          value={`${kpis.produtosAcima}`}
          delta={`${Math.round((kpis.produtosAcima / kpis.nProdutosComparaveis) * 100)}% dos ${kpis.nProdutosComparaveis} produtos comparáveis`}
          accent={ACCENT.pricing}
        />
        <KpiCard
          label="Produtos Abaixo do Mercado"
          value={`${kpis.produtosAbaixo}`}
          delta={`${Math.round((kpis.produtosAbaixo / kpis.nProdutosComparaveis) * 100)}% dos ${kpis.nProdutosComparaveis} produtos comparáveis`}
          accent={ACCENT.pricing}
        />
      </div>

      <p className="text-xs text-text-muted">
        Os {kpis.nProdutosComparaveis} produtos comparáveis somam quem tem ao
        menos um registro de concorrência; {kpis.produtosEmpatados} produto(s)
        têm preço próprio igual à média da concorrência. Excluídos: 20
        produtos placeholder (&ldquo;Produto Descontinuado&rdquo;) sem concorrência real.
      </p>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Desconto praticado x Posição vs. concorrência, por categoria
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {categoriaMaisCara && categoriaMaisBarata ? (
            <>
              <span className="font-medium">{categoriaMaisCara.categoria}</span> é a
              categoria mais cara frente à concorrência ({pct(categoriaMaisCara.posicaoMediaPct)}
              ), enquanto <span className="font-medium">{categoriaMaisBarata.categoria}</span>{" "}
              é a mais barata ({pct(categoriaMaisBarata.posicaoMediaPct)}).
            </>
          ) : null}
        </p>
        <div className="mt-4">
          <CategoriaPositionChart data={categorias} />
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Preço próprio vs. preço médio da concorrência, por categoria
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Valores absolutos em R$ — mesma base de dados do gráfico acima, sem
          normalizar por percentual.
        </p>
        <div className="mt-4">
          <CategoriaPriceComparisonChart data={categorias} />
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Preço da concorrência ao longo do dia de coleta
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          A coleta de preços de concorrentes (<code className="text-xs">preco_competidores.data_coleta</code>)
          cobre um único dia (11/01/2026), não um histórico de meses — por
          isso o gráfico mostra a variação intradiária do preço médio
          coletado por concorrente, não uma tendência de longo prazo.
        </p>
        <div className="mt-4">
          <CompetitorIntradayChart points={intradayPoints} concorrentes={concorrentes} />
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          Ranking de produtos vs. mercado
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Os 8 produtos com maior e menor diferença entre nosso preço de
          tabela e o preço médio coletado da concorrência.
        </p>
        <div className="mt-4">
          <ProdutoRankingTable acima={ranking.acima} abaixo={ranking.abaixo} />
        </div>
      </div>
    </div>
  );
}
