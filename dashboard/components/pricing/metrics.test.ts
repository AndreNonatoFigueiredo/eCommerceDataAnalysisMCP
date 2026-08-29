import { describe, expect, test } from "vitest";
import type { CompetidorRow, PricingDataset, ProdutoRow, VendaRow } from "./data";
import {
  computeCategoriaPricing,
  computeIntradayCompetitorSeries,
  computePricingKpis,
  computeProdutoRanking,
  isPlaceholderProduct,
} from "./metrics";

/**
 * Testes das agregações puras de Pricing & Margem (dono da lógica:
 * Teammate Pricing; testes: QA/Arquiteto — passada dedicada às seções
 * Vendas/Pricing). `fetchPricingDataset` (I/O, em ./data.ts) fica fora de
 * escopo — cobrimos as funções que recebem o dataset já carregado.
 *
 * Fixture: 2 produtos reais (P1 com 2 concorrentes, P2 com 1) + 1
 * placeholder (PX, "Produto Descontinuado") sem concorrência real.
 */
function buildFixture(): PricingDataset {
  const produtos: ProdutoRow[] = [
    { id_produto: "P1", nome_produto: "Fone Bluetooth", categoria: "Eletrônicos", marca: "Acme", preco_atual: 100 },
    { id_produto: "P2", nome_produto: "Caneca", categoria: "Casa", marca: "Zeta", preco_atual: 50 },
    { id_produto: "PX", nome_produto: "Produto Descontinuado", categoria: "Desconhecida", marca: "Desconhecida", preco_atual: 10 },
  ];

  const competidores: CompetidorRow[] = [
    { id_produto: "P1", nome_concorrente: "MktA", preco_concorrente: 90, data_coleta: "2026-01-11T02:00:00Z" },
    { id_produto: "P1", nome_concorrente: "MktA", preco_concorrente: 110, data_coleta: "2026-01-11T08:00:00Z" },
    { id_produto: "P2", nome_concorrente: "MktB", preco_concorrente: 60, data_coleta: "2026-01-11T20:00:00Z" },
  ];

  const vendas: VendaRow[] = [
    { id_produto: "P1", preco_unitario: 90 }, // desconto 10%
    { id_produto: "P1", preco_unitario: 100 }, // desconto 0%
    { id_produto: "P2", preco_unitario: 45 }, // desconto 10%
    { id_produto: "PX", preco_unitario: 8 }, // deve ser IGNORADO (placeholder)
  ];

  return { produtos, competidores, vendas };
}

describe("isPlaceholderProduct", () => {
  test("identifica pelo nome OU pela categoria 'Desconhecida'", () => {
    expect(isPlaceholderProduct({ nome_produto: "Produto Descontinuado", categoria: "X" })).toBe(true);
    expect(isPlaceholderProduct({ nome_produto: "X", categoria: "Desconhecida" })).toBe(true);
    expect(isPlaceholderProduct({ nome_produto: "Fone", categoria: "Eletrônicos" })).toBe(false);
  });
});

describe("computePricingKpis", () => {
  test("Desconto Médio Praticado ignora vendas de produtos placeholder", () => {
    const kpis = computePricingKpis(buildFixture());

    // (0.1 + 0 + 0.1) / 3 vendas válidas — a venda de PX é excluída
    expect(kpis.nVendasConsideradas).toBe(3);
    expect(kpis.descontoMedioPct).toBeCloseTo(0.2 / 3, 5);
  });

  test("Posição vs. Concorrência e contagem acima/abaixo/empatados batem com o preço médio por produto", () => {
    const kpis = computePricingKpis(buildFixture());

    // P1: concorrência média = (90+110)/2 = 100 -> diff = (100-100)/100 = 0
    // P2: concorrência média = 60 -> diff = (50-60)/60 ≈ -0.1667
    expect(kpis.nProdutosComparaveis).toBe(2); // PX fica de fora (sem concorrência)
    expect(kpis.posicaoMediaPct).toBeCloseTo((0 + (50 - 60) / 60) / 2, 5);
    expect(kpis.produtosAcima).toBe(0);
    expect(kpis.produtosAbaixo).toBe(1); // só P2 (diff < 0)
    expect(kpis.produtosEmpatados).toBe(1); // P1 (diff === 0)
  });

  test("produto placeholder nunca entra em nProdutosComparaveis mesmo se tivesse concorrência", () => {
    const dataset = buildFixture();
    // Dá concorrência ao placeholder de propósito — não deve mudar o resultado.
    dataset.competidores.push({
      id_produto: "PX",
      nome_concorrente: "MktC",
      preco_concorrente: 999,
      data_coleta: "2026-01-11T00:00:00Z",
    });
    const kpis = computePricingKpis(dataset);
    expect(kpis.nProdutosComparaveis).toBe(2);
  });
});

describe("computeCategoriaPricing", () => {
  test("agrega desconto e posição por categoria, ordenado desc por posicaoMediaPct", () => {
    const categorias = computeCategoriaPricing(buildFixture());
    const eletronicos = categorias.find((c) => c.categoria === "Eletrônicos")!;
    const casa = categorias.find((c) => c.categoria === "Casa")!;

    expect(eletronicos.descontoMedioPct).toBeCloseTo(0.05, 5); // média de 0.1 e 0
    expect(eletronicos.posicaoMediaPct).toBeCloseTo(0, 5);
    expect(casa.descontoMedioPct).toBeCloseTo(0.1, 5);
    expect(casa.posicaoMediaPct).toBeCloseTo((50 - 60) / 60, 5);

    // Eletrônicos (posição 0) mais "cara" que Casa (posição negativa) -> vem primeiro
    expect(categorias[0].categoria).toBe("Eletrônicos");

    // categoria "Desconhecida" (placeholder) nunca deve aparecer
    expect(categorias.find((c) => c.categoria === "Desconhecida")).toBeUndefined();
  });
});

describe("computeProdutoRanking", () => {
  test("ordena por diffPct desc e recorta acima/abaixo pelo limit, sem o placeholder", () => {
    const { acima, abaixo } = computeProdutoRanking(buildFixture(), 1);

    expect(acima).toHaveLength(1);
    expect(abaixo).toHaveLength(1);
    expect(acima[0].id_produto).toBe("P1"); // diff 0, maior dos dois
    expect(abaixo[0].id_produto).toBe("P2"); // diff negativo
    expect([...acima, ...abaixo].some((p) => p.id_produto === "PX")).toBe(false);
  });
});

describe("computeIntradayCompetitorSeries", () => {
  test("agrupa o preço médio coletado em 4 janelas de 6h do dia de coleta", () => {
    const { points, concorrentes } = computeIntradayCompetitorSeries(buildFixture());

    expect(concorrentes).toEqual(["MktA", "MktB"]); // ordem alfabética fixa
    expect(points.map((p) => p.bucket)).toEqual(["00h–06h", "06h–12h", "12h–18h", "18h–24h"]);

    const bucket00 = points.find((p) => p.bucket === "00h–06h")!;
    const bucket06 = points.find((p) => p.bucket === "06h–12h")!;
    const bucket18 = points.find((p) => p.bucket === "18h–24h")!;

    expect(bucket00.MktA).toBe(90);
    expect(bucket06.MktA).toBe(110);
    expect(bucket18.MktB).toBe(60);
    expect(bucket00.MktB).toBe(0); // sem coleta nessa janela -> 0, não undefined
  });
});
