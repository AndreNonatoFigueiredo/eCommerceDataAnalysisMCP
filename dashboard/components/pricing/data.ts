import { supabase } from "@/lib/supabase";

/**
 * Camada de acesso a dados da seção Pricing & Margem — usada apenas em
 * Server Components (ver dashboard/app/pricing/page.tsx). Toda a agregação
 * acontece em memória no servidor (ver ./metrics.ts); aqui só trazemos as
 * linhas brutas das tabelas `produtos`, `preco_competidores` e `vendas`.
 *
 * Não há coluna de custo/margem contábil no banco. Tudo que ./metrics.ts
 * chama de "margem" ou "posição" é uma leitura RELATIVA construída a partir
 * de:
 * - `produtos.preco_atual`      → preço de tabela corrente do produto
 * - `vendas.preco_unitario`     → preço efetivamente cobrado numa venda
 * - `preco_competidores.preco_concorrente` → preço de concorrentes, coletado
 *   em `data_coleta`
 *
 * Volumes são pequenos (235 produtos, 728 registros de concorrência, ~3000
 * vendas válidas) então buscamos as tabelas inteiras e agregamos em memória
 * em vez de várias queries agregadas no banco.
 */

export interface ProdutoRow {
  id_produto: string;
  nome_produto: string;
  categoria: string;
  marca: string;
  preco_atual: number;
}

export interface CompetidorRow {
  id_produto: string;
  nome_concorrente: string;
  preco_concorrente: number;
  data_coleta: string;
}

export interface VendaRow {
  id_produto: string;
  preco_unitario: number;
}

export interface PricingDataset {
  produtos: ProdutoRow[];
  competidores: CompetidorRow[];
  vendas: VendaRow[];
}

/** Tamanho máximo de página do PostgREST/Supabase por requisição. */
const PAGE_SIZE = 1000;

/**
 * `produtos` (235) e `preco_competidores` (728) cabem numa página só, mas
 * `vendas` (3020) não — por isso paginamos com `.range()` de forma
 * genérica nas 3 tabelas, por robustez.
 */
async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Falha ao buscar dados de "${table}": ${error.message}`);
    }
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

/** Busca produtos, preços de concorrentes e vendas em paralelo. */
export async function fetchPricingDataset(): Promise<PricingDataset> {
  const [produtosRaw, competidoresRaw, vendasRaw] = await Promise.all([
    fetchAllRows<{
      id_produto: string;
      nome_produto: string;
      categoria: string;
      marca: string;
      preco_atual: number | string;
    }>("produtos", "id_produto,nome_produto,categoria,marca,preco_atual"),
    fetchAllRows<{
      id_produto: string;
      nome_concorrente: string;
      preco_concorrente: number | string;
      data_coleta: string;
    }>(
      "preco_competidores",
      "id_produto,nome_concorrente,preco_concorrente,data_coleta"
    ),
    fetchAllRows<{ id_produto: string; preco_unitario: number | string }>(
      "vendas",
      "id_produto,preco_unitario"
    ),
  ]);

  return {
    produtos: produtosRaw.map((p) => ({ ...p, preco_atual: Number(p.preco_atual) })),
    competidores: competidoresRaw.map((c) => ({
      ...c,
      preco_concorrente: Number(c.preco_concorrente),
    })),
    vendas: vendasRaw.map((v) => ({ ...v, preco_unitario: Number(v.preco_unitario) })),
  };
}
