import type { PricingDataset, ProdutoRow } from "./data";

/**
 * Agregações da seção Pricing & Margem — funções puras (sem I/O), chamadas
 * pelo Server Component `app/pricing/page.tsx` sobre o dataset já buscado
 * do Supabase (ver ./data.ts). Ver TASKS.md > "Pricing & Margem" para o
 * racional das decisões de tratamento de dados citadas nos comentários
 * abaixo.
 */

const average = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((acc, v) => acc + v, 0) / values.length;

/**
 * 20 dos 235 produtos são placeholders ("Produto Descontinuado" /
 * categoria "Desconhecida") criados a partir de vendas órfãs (venda que
 * referencia um `id_produto` sem cadastro real). Eles não têm concorrência
 * real associada (confirmado: 0 registros em `preco_competidores` para
 * esses ids) — por isso são excluídos de TODAS as comparações de pricing
 * desta seção (KPIs, gráficos e tabela de ranking), incluindo o desconto
 * médio praticado, já que não representam um produto de catálogo real.
 */
export function isPlaceholderProduct(
  p: Pick<ProdutoRow, "nome_produto" | "categoria">
): boolean {
  return p.nome_produto === "Produto Descontinuado" || p.categoria === "Desconhecida";
}

interface ProdutoComPosicao {
  id_produto: string;
  nome_produto: string;
  categoria: string;
  marca: string;
  precoProprio: number;
  precoConcorrenteMedio: number;
  /** (precoProprio - precoConcorrenteMedio) / precoConcorrenteMedio */
  diffPct: number;
}

/**
 * Para cada produto real (não-placeholder) com pelo menos um registro de
 * concorrência, calcula o preço médio da concorrência (média entre os 4
 * marketplaces monitorados) e a diferença percentual frente ao nosso
 * preço de tabela. Base de "Posição vs. Concorrência" e da tabela de
 * ranking.
 */
function buildProdutosComPosicao(dataset: PricingDataset): ProdutoComPosicao[] {
  const precosPorProduto = new Map<string, number[]>();
  for (const c of dataset.competidores) {
    const arr = precosPorProduto.get(c.id_produto) ?? [];
    arr.push(c.preco_concorrente);
    precosPorProduto.set(c.id_produto, arr);
  }

  const result: ProdutoComPosicao[] = [];
  for (const p of dataset.produtos) {
    if (isPlaceholderProduct(p)) continue;
    const precosConcorrencia = precosPorProduto.get(p.id_produto);
    if (!precosConcorrencia || precosConcorrencia.length === 0) continue;
    const precoConcorrenteMedio = average(precosConcorrencia);
    result.push({
      id_produto: p.id_produto,
      nome_produto: p.nome_produto,
      categoria: p.categoria,
      marca: p.marca,
      precoProprio: p.preco_atual,
      precoConcorrenteMedio,
      diffPct: (p.preco_atual - precoConcorrenteMedio) / precoConcorrenteMedio,
    });
  }
  return result;
}

export interface PricingKpis {
  /** AVG(1 - vendas.preco_unitario / produtos.preco_atual), só produtos reais */
  descontoMedioPct: number;
  nVendasConsideradas: number;
  /** AVG((preco_atual - preco_concorrente_medio) / preco_concorrente_medio) por produto */
  posicaoMediaPct: number;
  nProdutosComparaveis: number;
  produtosAcima: number;
  produtosAbaixo: number;
  produtosEmpatados: number;
}

export function computePricingKpis(dataset: PricingDataset): PricingKpis {
  const produtosValidos = new Map(
    dataset.produtos.filter((p) => !isPlaceholderProduct(p)).map((p) => [p.id_produto, p])
  );

  const descontos: number[] = [];
  for (const v of dataset.vendas) {
    const produto = produtosValidos.get(v.id_produto);
    if (!produto || produto.preco_atual <= 0) continue;
    descontos.push(1 - v.preco_unitario / produto.preco_atual);
  }

  const produtosComPosicao = buildProdutosComPosicao(dataset);
  const produtosAcima = produtosComPosicao.filter((p) => p.diffPct > 0).length;
  const produtosAbaixo = produtosComPosicao.filter((p) => p.diffPct < 0).length;

  return {
    descontoMedioPct: average(descontos),
    nVendasConsideradas: descontos.length,
    posicaoMediaPct: average(produtosComPosicao.map((p) => p.diffPct)),
    nProdutosComparaveis: produtosComPosicao.length,
    produtosAcima,
    produtosAbaixo,
    produtosEmpatados: produtosComPosicao.length - produtosAcima - produtosAbaixo,
  };
}

export interface CategoriaPricingRow {
  categoria: string;
  /** desconto médio praticado nas vendas de produtos dessa categoria */
  descontoMedioPct: number;
  /** posição média vs. concorrência (positivo = mais caro que a concorrência) */
  posicaoMediaPct: number;
  precoProprioMedio: number;
  precoConcorrenteMedio: number;
  nProdutos: number;
}

/** Agrega desconto praticado e posição vs. concorrência por categoria. */
export function computeCategoriaPricing(dataset: PricingDataset): CategoriaPricingRow[] {
  const categoriaPorProduto = new Map(
    dataset.produtos.map((p) => [p.id_produto, p.categoria])
  );
  const precoAtualPorProduto = new Map(
    dataset.produtos.map((p) => [p.id_produto, p.preco_atual])
  );
  const produtosValidos = new Set(
    dataset.produtos.filter((p) => !isPlaceholderProduct(p)).map((p) => p.id_produto)
  );

  const descontosPorCategoria = new Map<string, number[]>();
  for (const v of dataset.vendas) {
    if (!produtosValidos.has(v.id_produto)) continue;
    const categoria = categoriaPorProduto.get(v.id_produto);
    const precoAtual = precoAtualPorProduto.get(v.id_produto);
    if (!categoria || !precoAtual) continue;
    const arr = descontosPorCategoria.get(categoria) ?? [];
    arr.push(1 - v.preco_unitario / precoAtual);
    descontosPorCategoria.set(categoria, arr);
  }

  const produtosComPosicao = buildProdutosComPosicao(dataset);
  const posicaoPorCategoria = new Map<
    string,
    { diffs: number[]; precosProprio: number[]; precosConcorrente: number[] }
  >();
  for (const p of produtosComPosicao) {
    const entry = posicaoPorCategoria.get(p.categoria) ?? {
      diffs: [],
      precosProprio: [],
      precosConcorrente: [],
    };
    entry.diffs.push(p.diffPct);
    entry.precosProprio.push(p.precoProprio);
    entry.precosConcorrente.push(p.precoConcorrenteMedio);
    posicaoPorCategoria.set(p.categoria, entry);
  }

  const categorias = new Set<string>([
    ...descontosPorCategoria.keys(),
    ...posicaoPorCategoria.keys(),
  ]);

  return Array.from(categorias)
    .map((categoria) => {
      const posicao = posicaoPorCategoria.get(categoria);
      return {
        categoria,
        descontoMedioPct: average(descontosPorCategoria.get(categoria) ?? []),
        posicaoMediaPct: posicao ? average(posicao.diffs) : 0,
        precoProprioMedio: posicao ? average(posicao.precosProprio) : 0,
        precoConcorrenteMedio: posicao ? average(posicao.precosConcorrente) : 0,
        nProdutos: posicao ? posicao.diffs.length : 0,
      };
    })
    .sort((a, b) => b.posicaoMediaPct - a.posicaoMediaPct);
}

const INTRADAY_BUCKETS = ["00h–06h", "06h–12h", "12h–18h", "18h–24h"] as const;

export interface IntradayPoint {
  bucket: string;
  [nomeConcorrente: string]: string | number;
}

/**
 * `data_coleta` de `preco_competidores` cobre uma única data-calendário
 * (2026-01-11) — não existe histórico de meses/dias para uma "evolução"
 * tradicional. O que os dados permitem mostrar de fato é a variação do
 * preço médio coletado por concorrente ao longo das horas daquele dia de
 * coleta. Deixamos isso explícito na legenda do gráfico para não sugerir
 * uma tendência de preço de longo prazo que os dados não sustentam.
 */
export function computeIntradayCompetitorSeries(dataset: PricingDataset): {
  points: IntradayPoint[];
  concorrentes: string[];
} {
  const concorrentes = Array.from(
    new Set(dataset.competidores.map((c) => c.nome_concorrente))
  ).sort((a, b) => a.localeCompare(b));

  const acumulado = new Map<string, Map<string, { soma: number; n: number }>>();
  for (const bucket of INTRADAY_BUCKETS) acumulado.set(bucket, new Map());

  for (const c of dataset.competidores) {
    const hora = new Date(c.data_coleta).getUTCHours();
    const bucket =
      hora < 6
        ? INTRADAY_BUCKETS[0]
        : hora < 12
          ? INTRADAY_BUCKETS[1]
          : hora < 18
            ? INTRADAY_BUCKETS[2]
            : INTRADAY_BUCKETS[3];
    const porConcorrente = acumulado.get(bucket)!;
    const atual = porConcorrente.get(c.nome_concorrente) ?? { soma: 0, n: 0 };
    atual.soma += c.preco_concorrente;
    atual.n += 1;
    porConcorrente.set(c.nome_concorrente, atual);
  }

  const points: IntradayPoint[] = INTRADAY_BUCKETS.map((bucket) => {
    const porConcorrente = acumulado.get(bucket)!;
    const point: IntradayPoint = { bucket };
    for (const nome of concorrentes) {
      const stats = porConcorrente.get(nome);
      point[nome] = stats ? Number((stats.soma / stats.n).toFixed(2)) : 0;
    }
    return point;
  });

  return { points, concorrentes };
}

export interface ProdutoRankingRow {
  id_produto: string;
  nome_produto: string;
  categoria: string;
  marca: string;
  precoProprio: number;
  precoConcorrenteMedio: number;
  diffPct: number;
}

/** Top N produtos mais acima e mais abaixo do preço médio da concorrência. */
export function computeProdutoRanking(
  dataset: PricingDataset,
  limit = 8
): { acima: ProdutoRankingRow[]; abaixo: ProdutoRankingRow[] } {
  const ordenado = buildProdutosComPosicao(dataset)
    .map((p) => ({
      id_produto: p.id_produto,
      nome_produto: p.nome_produto,
      categoria: p.categoria,
      marca: p.marca,
      precoProprio: p.precoProprio,
      precoConcorrenteMedio: Number(p.precoConcorrenteMedio.toFixed(2)),
      diffPct: p.diffPct,
    }))
    .sort((a, b) => b.diffPct - a.diffPct);

  return {
    acima: ordenado.slice(0, limit),
    abaixo: ordenado.slice(-limit).reverse(),
  };
}
