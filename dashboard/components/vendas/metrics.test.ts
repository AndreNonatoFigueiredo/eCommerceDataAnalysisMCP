import { describe, expect, test } from "vitest";
import {
  computeDailySeries,
  computeKpiSummary,
  computeLeadingChannelShareTrend,
  computeRevenueByChannel,
  computeRevenueByWeekday,
  computeTopProdutos,
  isProdutoPlaceholder,
  splitByHalves,
  valorLinha,
  variacaoPercentual,
} from "./metrics";
import type { ProdutoRow, VendaRow } from "./data";

/**
 * Testes da agregação pura de Vendas & Receita (dono da lógica: Teammate
 * Vendas; testes: QA/Arquiteto — passada dedicada à seção).
 *
 * Fixture: 4 vendas em 4 dias distintos (2 na 1ª metade, 2 na 2ª metade),
 * 2 canais, e 1 venda de um produto placeholder ("Desconhecida") para
 * travar a regra "mantido nos KPIs de topo, excluído do Top Produtos".
 */
function buildFixture(): { vendas: VendaRow[]; produtos: ProdutoRow[] } {
  const produtos: ProdutoRow[] = [
    { id_produto: "P1", nome_produto: "Fone Bluetooth", categoria: "Eletrônicos", marca: "Acme" },
    { id_produto: "P2", nome_produto: "Caneca", categoria: "Casa", marca: "Zeta" },
    { id_produto: "PX", nome_produto: "Produto Descontinuado", categoria: "Desconhecida", marca: "Desconhecida" },
  ];

  const vendas: VendaRow[] = [
    // 1ª metade (dias 01, 02)
    { id_venda: "V1", data_venda: "2026-01-01T10:00:00Z", id_produto: "P1", canal_venda: "ecommerce", quantidade: 1, preco_unitario: 100 },
    { id_venda: "V2", data_venda: "2026-01-02T10:00:00Z", id_produto: "P2", canal_venda: "loja_fisica", quantidade: 2, preco_unitario: 20 },
    // 2ª metade (dias 03, 04)
    { id_venda: "V3", data_venda: "2026-01-03T10:00:00Z", id_produto: "P1", canal_venda: "ecommerce", quantidade: 3, preco_unitario: 100 },
    { id_venda: "V4", data_venda: "2026-01-04T10:00:00Z", id_produto: "PX", canal_venda: "ecommerce", quantidade: 1, preco_unitario: 50 },
  ];

  return { vendas, produtos };
}

describe("valorLinha / isProdutoPlaceholder", () => {
  test("valorLinha = quantidade * preco_unitario", () => {
    expect(valorLinha({ quantidade: 3, preco_unitario: 10 })).toBe(30);
  });

  test("isProdutoPlaceholder identifica categoria 'Desconhecida'", () => {
    expect(isProdutoPlaceholder({ categoria: "Desconhecida" })).toBe(true);
    expect(isProdutoPlaceholder({ categoria: "Eletrônicos" })).toBe(false);
  });
});

describe("computeKpiSummary", () => {
  test("Receita Total, Nº de Pedidos e Ticket Médio incluem TODAS as vendas (inclusive placeholder)", () => {
    const { vendas } = buildFixture();
    const kpis = computeKpiSummary(vendas);

    // 100 + 40 + 300 + 50 = 490
    expect(kpis.receitaTotal).toBe(490);
    expect(kpis.numeroPedidos).toBe(4);
    expect(kpis.ticketMedio).toBe(490 / 4);
    expect(kpis.numeroDiasComVenda).toBe(4);
  });

  test("lista vazia não quebra (guards de divisão por zero)", () => {
    const kpis = computeKpiSummary([]);
    expect(kpis).toEqual({
      receitaTotal: 0,
      numeroPedidos: 0,
      ticketMedio: 0,
      numeroDiasComVenda: 0,
    });
  });
});

describe("splitByHalves", () => {
  test("divide os dias distintos com venda ao meio (2ª metade fica com o dia do meio pra cima)", () => {
    const { vendas } = buildFixture();
    const { primeira, segunda } = splitByHalves(vendas);

    expect(primeira.map((v) => v.id_venda)).toEqual(["V1", "V2"]);
    expect(segunda.map((v) => v.id_venda)).toEqual(["V3", "V4"]);
  });

  test("um único dia com venda: tudo cai na 1ª metade, 2ª fica vazia", () => {
    const vendas: VendaRow[] = [
      { id_venda: "V1", data_venda: "2026-01-01T10:00:00Z", id_produto: "P1", canal_venda: "ecommerce", quantidade: 1, preco_unitario: 10 },
    ];
    const { primeira, segunda } = splitByHalves(vendas);
    expect(primeira).toHaveLength(1);
    expect(segunda).toHaveLength(0);
  });
});

describe("variacaoPercentual", () => {
  test("calcula variação percentual e trend 'up'/'down'/'neutral'", () => {
    expect(variacaoPercentual(150, 100)).toEqual({ percentual: 50, trend: "up" });
    expect(variacaoPercentual(50, 100)).toEqual({ percentual: -50, trend: "down" });
    expect(variacaoPercentual(100.02, 100)).toMatchObject({ trend: "neutral" });
  });

  test("base 0 retorna percentual null e trend neutral (evita divisão por zero)", () => {
    expect(variacaoPercentual(10, 0)).toEqual({ percentual: null, trend: "neutral" });
  });
});

describe("computeDailySeries", () => {
  test("agrupa receita e pedidos por dia (YYYY-MM-DD), ordenado cronologicamente", () => {
    const { vendas } = buildFixture();
    const serie = computeDailySeries(vendas);

    expect(serie.map((p) => p.data)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(serie[0]).toMatchObject({ receita: 100, pedidos: 1 });
    expect(serie[2]).toMatchObject({ receita: 300, pedidos: 1 });
  });
});

describe("computeRevenueByChannel", () => {
  test("agrupa por canal e calcula participação sobre a receita total (incluindo placeholder)", () => {
    const { vendas } = buildFixture();
    const porCanal = computeRevenueByChannel(vendas);

    // ecommerce: V1(100) + V3(300) + V4(50) = 450 | loja_fisica: V2(40)
    const ecommerce = porCanal.find((c) => c.canal === "ecommerce")!;
    const loja = porCanal.find((c) => c.canal === "loja_fisica")!;

    expect(ecommerce.receita).toBe(450);
    expect(loja.receita).toBe(40);
    expect(ecommerce.participacao).toBeCloseTo(450 / 490, 5);
    expect(porCanal[0].canal).toBe("ecommerce"); // ordenado desc por receita
    expect(ecommerce.label).toBe("E-commerce"); // usa CHANNEL_LABELS
  });
});

describe("computeLeadingChannelShareTrend", () => {
  test("retorna null quando não há vendas", () => {
    expect(computeLeadingChannelShareTrend([])).toBeNull();
  });

  test("identifica o canal líder e a variação de participação entre metades", () => {
    const { vendas } = buildFixture();
    const trend = computeLeadingChannelShareTrend(vendas);

    expect(trend?.label).toBe("E-commerce");
    // 1ª metade: só V1 é ecommerce de 2 vendas (100 de 140) = 100/140
    // 2ª metade: V3+V4 são ecommerce, 100% da receita da metade
    expect(trend?.deltaPontosPercentuais).toBeGreaterThan(0);
  });
});

describe("computeRevenueByWeekday", () => {
  test("retorna 7 posições (dom-sáb) mesmo com dias sem venda", () => {
    const { vendas } = buildFixture();
    const porDia = computeRevenueByWeekday(vendas);

    expect(porDia).toHaveLength(7);
    expect(porDia.reduce((s, d) => s + d.receita, 0)).toBe(490);
    expect(porDia.map((d) => d.label)).toEqual([
      "Dom",
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
    ]);
  });
});

describe("computeTopProdutos", () => {
  test("exclui produtos placeholder do ranking, mesmo tendo receita", () => {
    const { vendas, produtos } = buildFixture();
    const ranking = computeTopProdutos(vendas, produtos, 10);

    expect(ranking.find((p) => p.id_produto === "PX")).toBeUndefined();
    expect(ranking.map((p) => p.id_produto)).toEqual(["P1", "P2"]); // P1 (400) > P2 (40)
    expect(ranking[0]).toMatchObject({ receita: 400, quantidade: 4, pedidos: 2 });
  });

  test("respeita o parâmetro limit", () => {
    const { vendas, produtos } = buildFixture();
    const ranking = computeTopProdutos(vendas, produtos, 1);
    expect(ranking).toHaveLength(1);
  });

  test("venda de produto inexistente em `produtos` não quebra a agregação", () => {
    const { vendas, produtos } = buildFixture();
    const vendasComOrfao: VendaRow[] = [
      ...vendas,
      { id_venda: "V5", data_venda: "2026-01-05T10:00:00Z", id_produto: "FANTASMA", canal_venda: "ecommerce", quantidade: 1, preco_unitario: 10 },
    ];
    expect(() => computeTopProdutos(vendasComOrfao, produtos, 10)).not.toThrow();
  });
});
