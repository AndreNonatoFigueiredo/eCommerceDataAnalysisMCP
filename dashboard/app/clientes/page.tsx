import { KpiCard } from "@/components/ui/KpiCard";
import { ACCENT, STATUS } from "@/lib/colors";
import { fetchClientesEVendas } from "@/components/clientes/data";
import { buildClienteMetrics } from "@/components/clientes/metrics";
import { formatCurrency, formatDate, formatDecimal, formatNumber } from "@/components/clientes/format";
import { GeoDistributionChart } from "@/components/clientes/GeoDistributionChart";
import { HistogramChart } from "@/components/clientes/HistogramChart";
import { SectionCard } from "@/components/clientes/SectionCard";
import { TopCustomersTable } from "@/components/clientes/TopCustomersTable";

/**
 * Seção Clientes & Comportamento — dono: Teammate Clientes.
 *
 * História: quem são nossos clientes, de onde vêm, com que frequência
 * compram e estamos retendo bem?
 *
 * Dados vêm de `clientes` (50 linhas) e `vendas` (3020 linhas, tabela fato)
 * do Supabase, buscados via `fetchClientesEVendas` (ver
 * components/clientes/data.ts) — `vendas` é paginada em blocos de 1000
 * porque o PostgREST/Supabase trunca respostas nesse limite por padrão.
 * Volume pequeno o suficiente para trazer tudo e agregar em memória em
 * `components/clientes/metrics.ts` (sem N+1, sem fetch por cliente). Ver
 * fórmulas dos KPIs nos comentários daquele arquivo e em dashboard/TASKS.md.
 */
export default async function ClientesPage() {
  let clientes, vendas;
  try {
    ({ clientes, vendas } = await fetchClientesEVendas());
  } catch (err) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Clientes & Comportamento
        </h1>
        <p className="text-sm" style={{ color: STATUS.critical }}>
          Não foi possível carregar os dados de clientes/vendas do Supabase.
          {" "}
          {err instanceof Error ? err.message : String(err)}
        </p>
      </div>
    );
  }

  const metrics = buildClienteMetrics(clientes, vendas);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Clientes & Comportamento
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Quem são os {formatNumber(metrics.totalClientesCadastrados)} clientes
          cadastrados, de onde vêm, com que frequência compram e se a base
          está sendo retida ao longo do tempo. Recência e retenção são
          calculadas em relação à venda mais recente da base (
          {formatDate(metrics.dataReferencia)}), já que o dataset é um
          recorte histórico fixo — usar a data atual do sistema inflaria
          artificialmente a inatividade de todos os clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Clientes Ativos"
          value={formatNumber(metrics.clientesAtivos)}
          delta={`${formatDecimal(metrics.pctClientesAtivos)}% dos ${formatNumber(
            metrics.totalClientesCadastrados
          )} cadastrados fizeram ao menos 1 compra`}
          accent={ACCENT.clientes}
        />
        <KpiCard
          label="Frequência Média de Compra"
          value={`${formatDecimal(metrics.freqMediaCompras)} compras/cliente`}
          delta="total de vendas ÷ clientes ativos"
          accent={ACCENT.clientes}
        />
        <KpiCard
          label="Ticket Médio por Cliente"
          value={formatCurrency(metrics.ticketMedioPorCliente)}
          delta="receita total ÷ clientes ativos (lifetime)"
          accent={ACCENT.clientes}
        />
        <KpiCard
          label="Recência Média"
          value={`${formatDecimal(metrics.recenciaMediaDias)} dias`}
          delta="média de dias desde a última compra"
          accent={ACCENT.clientes}
        />
        <KpiCard
          label="Retenção Multi-Mês"
          value={`${formatDecimal(metrics.pctRetencaoMultiMes)}%`}
          delta={`${formatNumber(metrics.clientesRetidos)} clientes compraram em 2+ meses distintos`}
          accent={ACCENT.clientes}
        />
        <KpiCard
          label="Estados Atendidos"
          value={formatNumber(metrics.estadosAtendidos)}
          delta="estados com pelo menos 1 cliente ativo"
          accent={ACCENT.clientes}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Distribuição Geográfica por Estado"
          description="Número de clientes ativos por estado (UF)."
        >
          <GeoDistributionChart data={metrics.geoDistribution} />
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard
            title="Recência de Compra"
            description="Nº de clientes por faixa de dias desde a última compra."
          >
            <HistogramChart
              data={metrics.recencyBuckets}
              tooltipLabel="Clientes"
            />
          </SectionCard>

          <SectionCard
            title="Frequência de Compra"
            description="Nº de clientes por faixa de quantidade de vendas realizadas."
          >
            <HistogramChart
              data={metrics.frequencyBuckets}
              tooltipLabel="Clientes"
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title="Top 10 Clientes por Receita"
        description="Maiores clientes em receita acumulada (quantidade × preço unitário) no período do dataset."
      >
        <TopCustomersTable data={metrics.topClientesPorReceita} />
      </SectionCard>
    </div>
  );
}
