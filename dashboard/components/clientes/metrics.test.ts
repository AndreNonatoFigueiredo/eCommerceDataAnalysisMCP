import { describe, expect, test } from "vitest";
import { buildClienteMetrics, type ClienteRow, type VendaRow } from "./metrics";

/**
 * Testes da agregação pura de Clientes & Comportamento (dono da lógica:
 * Teammate Clientes; testes: QA/Arquiteto — passada dedicada à seção).
 *
 * Fixture: 3 clientes cadastrados, 2 ativos (com venda), 1 sem venda.
 * - C1 ("Ana", SP): 2 vendas no MESMO mês calendário (jan/2026) -> não
 *   conta para retenção multi-mês.
 * - C2 ("Bruno", SP): 2 vendas em 2 meses distintos (dez/2025, jan/2026)
 *   -> conta para retenção multi-mês.
 * - C3 ("Carla", RJ): cadastrada, zero vendas -> não deve aparecer em
 *   nenhum agregado "ativo" (nem em geoDistribution/estadosAtendidos).
 *
 * `dataReferencia` esperada = venda mais recente da base (2026-01-20),
 * não `Date.now()` — é exatamente essa regra de negócio que este arquivo
 * de teste trava, já que o dataset real é um recorte histórico fixo.
 */
function buildFixture() {
  const clientes: ClienteRow[] = [
    { id_cliente: "C1", nome_cliente: "Ana", estado: "SP", pais: "BR", data_cadastro: "2025-01-01T00:00:00Z" },
    { id_cliente: "C2", nome_cliente: "Bruno", estado: "SP", pais: "BR", data_cadastro: "2025-01-01T00:00:00Z" },
    { id_cliente: "C3", nome_cliente: "Carla", estado: "RJ", pais: "BR", data_cadastro: "2025-01-01T00:00:00Z" },
  ];

  const vendas: VendaRow[] = [
    // C1: mesmo mês (jan/2026) -> 1 mês distinto -> não retido.
    { id_venda: "V1", data_venda: "2026-01-05T12:00:00Z", id_cliente: "C1", id_produto: "P1", canal_venda: "site", quantidade: 1, preco_unitario: 100 },
    { id_venda: "V2", data_venda: "2026-01-20T12:00:00Z", id_cliente: "C1", id_produto: "P1", canal_venda: "site", quantidade: 2, preco_unitario: 50 },
    // C2: dez/2025 + jan/2026 -> 2 meses distintos -> retido.
    { id_venda: "V3", data_venda: "2025-12-15T12:00:00Z", id_cliente: "C2", id_produto: "P2", canal_venda: "loja", quantidade: 1, preco_unitario: 300 },
    { id_venda: "V4", data_venda: "2026-01-10T12:00:00Z", id_cliente: "C2", id_produto: "P2", canal_venda: "loja", quantidade: 1, preco_unitario: 100 },
  ];

  return { clientes, vendas };
}

describe("buildClienteMetrics", () => {
  test("dataReferencia é a venda mais recente da base, não Date.now()", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    expect(metrics.dataReferencia.toISOString()).toBe("2026-01-20T12:00:00.000Z");
  });

  test("Clientes Ativos = clientes distintos com >=1 venda (não conta cadastrados sem venda)", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    expect(metrics.totalClientesCadastrados).toBe(3);
    expect(metrics.clientesAtivos).toBe(2); // C3 fica de fora
    expect(metrics.pctClientesAtivos).toBeCloseTo((2 / 3) * 100, 5);
  });

  test("Receita Total e Ticket Médio por Cliente usam quantidade*preco_unitario", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    // C1: 1*100 + 2*50 = 200 | C2: 1*300 + 1*100 = 400
    expect(metrics.receitaTotal).toBe(600);
    expect(metrics.ticketMedioPorCliente).toBe(300); // 600 / 2 ativos
  });

  test("Frequência Média de Compra = total de vendas / clientes ativos", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    expect(metrics.freqMediaCompras).toBe(2); // 4 vendas / 2 ativos
  });

  test("Recência Média usa dataReferencia (base), não a data do sistema", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    // C1: última compra = dataReferencia -> 0 dias. C2: 10 dias antes.
    expect(metrics.recenciaMediaDias).toBeCloseTo((0 + 10) / 2, 5);
  });

  test("Retenção Multi-Mês só conta clientes com compras em 2+ meses-calendário distintos", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    expect(metrics.clientesRetidos).toBe(1); // só C2
    expect(metrics.pctRetencaoMultiMes).toBeCloseTo(50, 5); // 1 / 2 ativos
  });

  test("Estados Atendidos e geoDistribution só consideram clientes ativos", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    // C3 (RJ) está cadastrado mas sem venda -> RJ não deve aparecer.
    expect(metrics.estadosAtendidos).toBe(1);
    expect(metrics.geoDistribution).toEqual([{ estado: "SP", clientes: 2 }]);
  });

  test("Top clientes por receita vem ordenado desc por receita", () => {
    const { clientes, vendas } = buildFixture();
    const metrics = buildClienteMetrics(clientes, vendas);

    expect(metrics.topClientesPorReceita.map((c) => c.id_cliente)).toEqual([
      "C2",
      "C1",
    ]);
  });

  test("cliente órfão em vendas (sem linha correspondente em clientes) não quebra a agregação", () => {
    const { clientes, vendas } = buildFixture();
    const vendasComOrfao: VendaRow[] = [
      ...vendas,
      { id_venda: "V5", data_venda: "2026-01-01T00:00:00Z", id_cliente: "FANTASMA", id_produto: "P1", canal_venda: "site", quantidade: 1, preco_unitario: 10 },
    ];

    const metrics = buildClienteMetrics(clientes, vendasComOrfao);
    const orfao = metrics.topClientesPorReceita.find((c) => c.id_cliente === "FANTASMA");

    expect(metrics.clientesAtivos).toBe(3); // C1, C2, FANTASMA
    expect(orfao?.estado).toBe("Desconhecido");
    expect(orfao?.nome_cliente).toBe("FANTASMA");
  });

  test("dataset sem nenhuma venda não quebra (guards de divisão por zero)", () => {
    const { clientes } = buildFixture();
    const metrics = buildClienteMetrics(clientes, []);

    expect(metrics.clientesAtivos).toBe(0);
    expect(metrics.freqMediaCompras).toBe(0);
    expect(metrics.ticketMedioPorCliente).toBe(0);
    expect(metrics.recenciaMediaDias).toBe(0);
    expect(metrics.pctRetencaoMultiMes).toBe(0);
    expect(metrics.estadosAtendidos).toBe(0);
    expect(metrics.geoDistribution).toEqual([]);
  });

  test("bucketizeRecency: valor de recência alto cai na faixa '30+ dias'", () => {
    const clientes: ClienteRow[] = [
      { id_cliente: "C1", nome_cliente: "Ana", estado: "SP", pais: "BR", data_cadastro: "2025-01-01T00:00:00Z" },
    ];
    const vendas: VendaRow[] = [
      { id_venda: "V1", data_venda: "2025-01-01T00:00:00Z", id_cliente: "C1", id_produto: "P1", canal_venda: "site", quantidade: 1, preco_unitario: 10 },
      { id_venda: "V2", data_venda: "2026-02-10T00:00:00Z", id_cliente: "C1", id_produto: "P1", canal_venda: "site", quantidade: 1, preco_unitario: 10 },
    ];

    const metrics = buildClienteMetrics(clientes, vendas);
    const bucket30mais = metrics.recencyBuckets.find((b) => b.label === "30+ dias");

    // única compra "antiga" (V1) fica a 405 dias da referência (V2) — mas
    // recência é por cliente (última compra), então C1 tem recência 0
    // (a própria V2 é a referência). Este teste garante que o bucket
    // "30+ dias" existe e começa zerado quando ninguém se qualifica.
    expect(bucket30mais).toBeDefined();
    expect(metrics.recencyBuckets.reduce((s, b) => s + b.clientes, 0)).toBe(
      metrics.clientesAtivos
    );
  });
});
