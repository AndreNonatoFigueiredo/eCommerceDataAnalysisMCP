/**
 * Agregação de Clientes & Comportamento — regras de negócio puras (sem I/O).
 *
 * Fonte dos dados brutos: tabelas `clientes` (50 linhas) e `vendas` (3020
 * linhas) do Supabase. O dataset é um snapshot histórico fixo (vendas entre
 * 2025-12-13 e 2026-01-11) — por isso "recência" é calculada em relação à
 * venda mais recente da própria base (`dataReferencia`), não à data atual do
 * sistema, o que inflaria artificialmente a inatividade de todos os
 * clientes.
 *
 * Cada linha de `vendas` já é uma venda distinta (id_venda é PK), então
 * "frequência de compra" = número de linhas de `vendas` por cliente.
 *
 * Ver dashboard/TASKS.md > tabela "Clientes" para as fórmulas documentadas.
 */

export interface ClienteRow {
  id_cliente: string;
  nome_cliente: string;
  estado: string;
  pais: string;
  data_cadastro: string;
}

export interface VendaRow {
  id_venda: string;
  data_venda: string;
  id_cliente: string;
  id_produto: string;
  canal_venda: string;
  quantidade: number;
  preco_unitario: number;
}

export interface ClienteAgregado {
  id_cliente: string;
  nome_cliente: string;
  estado: string;
  pais: string;
  nVendas: number;
  receita: number;
  primeiraCompra: Date;
  ultimaCompra: Date;
  mesesDistintos: number;
  recenciaDias: number;
}

export interface BucketCount {
  label: string;
  clientes: number;
}

export interface GeoBucket {
  estado: string;
  clientes: number;
}

export interface ClienteMetrics {
  dataReferencia: Date;
  totalClientesCadastrados: number;
  clientesAtivos: number;
  pctClientesAtivos: number;
  receitaTotal: number;
  freqMediaCompras: number;
  ticketMedioPorCliente: number;
  recenciaMediaDias: number;
  clientesRetidos: number;
  pctRetencaoMultiMes: number;
  estadosAtendidos: number;
  geoDistribution: GeoBucket[];
  recencyBuckets: BucketCount[];
  frequencyBuckets: BucketCount[];
  topClientesPorReceita: ClienteAgregado[];
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;

const diffInDays = (later: Date, earlier: Date) =>
  Math.round((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));

/** Agrupa `vendas` por `id_cliente` e junta com o cadastro em `clientes`. */
function aggregateByCliente(
  clientes: ClienteRow[],
  vendas: VendaRow[]
): { agregados: ClienteAgregado[]; dataReferencia: Date } {
  const clienteById = new Map(clientes.map((c) => [c.id_cliente, c]));

  type Acc = {
    nVendas: number;
    receita: number;
    primeiraCompra: Date;
    ultimaCompra: Date;
    meses: Set<string>;
  };
  const acc = new Map<string, Acc>();
  let dataReferencia = new Date(0);

  for (const v of vendas) {
    const data = new Date(v.data_venda);
    if (data > dataReferencia) dataReferencia = data;

    const linhaValor = v.quantidade * v.preco_unitario;
    const existing = acc.get(v.id_cliente);
    if (!existing) {
      acc.set(v.id_cliente, {
        nVendas: 1,
        receita: linhaValor,
        primeiraCompra: data,
        ultimaCompra: data,
        meses: new Set([monthKey(data)]),
      });
    } else {
      existing.nVendas += 1;
      existing.receita += linhaValor;
      if (data < existing.primeiraCompra) existing.primeiraCompra = data;
      if (data > existing.ultimaCompra) existing.ultimaCompra = data;
      existing.meses.add(monthKey(data));
    }
  }

  const agregados: ClienteAgregado[] = [];
  for (const [id_cliente, a] of acc.entries()) {
    const cliente = clienteById.get(id_cliente);
    agregados.push({
      id_cliente,
      nome_cliente: cliente?.nome_cliente ?? id_cliente,
      estado: cliente?.estado ?? "Desconhecido",
      pais: cliente?.pais ?? "Desconhecido",
      nVendas: a.nVendas,
      receita: a.receita,
      primeiraCompra: a.primeiraCompra,
      ultimaCompra: a.ultimaCompra,
      mesesDistintos: a.meses.size,
      recenciaDias: diffInDays(dataReferencia, a.ultimaCompra),
    });
  }

  return { agregados, dataReferencia };
}

/** Faixas fixas de recência (dias desde a última compra até a data de
 * referência). Mantidas mesmo quando vazias para preservar a escala do
 * histograma. */
function bucketizeRecency(agregados: ClienteAgregado[]): BucketCount[] {
  const edges: { max: number; label: string }[] = [
    { max: 0, label: "0 dias" },
    { max: 1, label: "1 dia" },
    { max: 2, label: "2 dias" },
    { max: 6, label: "3–6 dias" },
    { max: 13, label: "7–13 dias" },
    { max: 29, label: "14–29 dias" },
    { max: Infinity, label: "30+ dias" },
  ];
  const counts = edges.map((e) => ({ label: e.label, clientes: 0 }));
  for (const a of agregados) {
    const idx = edges.findIndex((e) => a.recenciaDias <= e.max);
    counts[idx === -1 ? counts.length - 1 : idx].clientes += 1;
  }
  return counts;
}

/** Escolhe uma largura de bucket "redonda" (1/2/5/10/20/25/50/100...) que
 * mantenha o histograma de frequência de compra entre ~5 e ~9 barras,
 * independente da escala real dos dados. */
function niceBinWidth(min: number, max: number, targetBins = 7): number {
  const range = Math.max(1, max - min);
  const rawWidth = range / targetBins;
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return steps.find((s) => s >= rawWidth) ?? steps[steps.length - 1];
}

function bucketizeFrequency(agregados: ClienteAgregado[]): BucketCount[] {
  if (agregados.length === 0) return [];
  const valores = agregados.map((a) => a.nVendas);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const width = niceBinWidth(min, max);
  const start = Math.floor(min / width) * width;
  const end = Math.floor(max / width) * width;

  const buckets: BucketCount[] = [];
  for (let lo = start; lo <= end; lo += width) {
    const hi = lo + width - 1;
    buckets.push({ label: width === 1 ? `${lo}` : `${lo}–${hi}`, clientes: 0 });
  }
  for (const a of valores) {
    const idx = Math.min(
      buckets.length - 1,
      Math.floor((a - start) / width)
    );
    buckets[idx].clientes += 1;
  }
  return buckets;
}

function buildGeoDistribution(agregados: ClienteAgregado[]): GeoBucket[] {
  const counts = new Map<string, number>();
  for (const a of agregados) {
    counts.set(a.estado, (counts.get(a.estado) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([estado, clientes]) => ({ estado, clientes }))
    .sort((a, b) => b.clientes - a.clientes || a.estado.localeCompare(b.estado));
}

/**
 * Calcula todos os KPIs e séries de gráfico da seção Clientes & Comportamento
 * a partir das linhas brutas de `clientes` e `vendas`.
 *
 * KPIs (fórmula · fonte):
 * - Clientes Ativos = COUNT(DISTINCT vendas.id_cliente) · vendas
 * - Frequência Média de Compra = COUNT(vendas.id_venda) / Clientes Ativos · vendas
 * - Ticket Médio por Cliente = SUM(vendas.quantidade*vendas.preco_unitario) / Clientes Ativos · vendas
 * - Recência Média = AVG(dataReferencia - MAX(vendas.data_venda) por cliente), em dias · vendas
 * - Retenção Multi-Mês = COUNT(clientes com >=2 meses-calendário distintos de compra) / Clientes Ativos · vendas
 * - Estados Atendidos = COUNT(DISTINCT clientes.estado) entre clientes ativos · clientes
 */
export function buildClienteMetrics(
  clientes: ClienteRow[],
  vendas: VendaRow[]
): ClienteMetrics {
  const { agregados, dataReferencia } = aggregateByCliente(clientes, vendas);

  const clientesAtivos = agregados.length;
  const totalClientesCadastrados = clientes.length;
  const receitaTotal = agregados.reduce((sum, a) => sum + a.receita, 0);
  const totalVendas = agregados.reduce((sum, a) => sum + a.nVendas, 0);
  const clientesRetidos = agregados.filter((a) => a.mesesDistintos >= 2).length;
  const recenciaMediaDias =
    clientesAtivos > 0
      ? agregados.reduce((sum, a) => sum + a.recenciaDias, 0) / clientesAtivos
      : 0;
  const estadosAtendidos = new Set(agregados.map((a) => a.estado)).size;

  const topClientesPorReceita = [...agregados]
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10);

  return {
    dataReferencia,
    totalClientesCadastrados,
    clientesAtivos,
    pctClientesAtivos:
      totalClientesCadastrados > 0
        ? (clientesAtivos / totalClientesCadastrados) * 100
        : 0,
    receitaTotal,
    freqMediaCompras: clientesAtivos > 0 ? totalVendas / clientesAtivos : 0,
    ticketMedioPorCliente: clientesAtivos > 0 ? receitaTotal / clientesAtivos : 0,
    recenciaMediaDias,
    clientesRetidos,
    pctRetencaoMultiMes:
      clientesAtivos > 0 ? (clientesRetidos / clientesAtivos) * 100 : 0,
    estadosAtendidos,
    geoDistribution: buildGeoDistribution(agregados),
    recencyBuckets: bucketizeRecency(agregados),
    frequencyBuckets: bucketizeFrequency(agregados),
    topClientesPorReceita,
  };
}
