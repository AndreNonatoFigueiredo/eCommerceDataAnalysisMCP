import { supabase } from "@/lib/supabase";

/**
 * Camada de acesso a dados da seção Vendas & Receita — usada apenas em
 * Server Components (ver dashboard/app/vendas/page.tsx). Toda a agregação
 * acontece em memória no servidor (ver ./metrics.ts); aqui só trazemos as
 * linhas brutas das tabelas `vendas` e `produtos`.
 */

export interface VendaRow {
  id_venda: string;
  data_venda: string;
  id_produto: string;
  canal_venda: string;
  quantidade: number;
  preco_unitario: number;
}

export interface ProdutoRow {
  id_produto: string;
  nome_produto: string;
  categoria: string;
  marca: string;
}

/** Tamanho máximo de página do PostgREST/Supabase por requisição. */
const PAGE_SIZE = 1000;

/**
 * Busca todas as ~3020 linhas de `vendas`, paginando em blocos de 1000 (o
 * client Supabase/PostgREST limita cada resposta a esse tamanho por
 * padrão). O volume é pequeno o suficiente para trazer tudo e agregar em
 * TypeScript em vez de fazer várias queries agregadas no banco.
 */
async function fetchAllVendas(): Promise<VendaRow[]> {
  const vendas: VendaRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("vendas")
      .select("id_venda, data_venda, id_produto, canal_venda, quantidade, preco_unitario")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Falha ao buscar vendas do Supabase: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    vendas.push(...(data as VendaRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return vendas;
}

/** `produtos` tem 235 linhas — cabe inteira em uma única página. */
async function fetchAllProdutos(): Promise<ProdutoRow[]> {
  const { data, error } = await supabase
    .from("produtos")
    .select("id_produto, nome_produto, categoria, marca");

  if (error) {
    throw new Error(`Falha ao buscar produtos do Supabase: ${error.message}`);
  }

  return (data ?? []) as ProdutoRow[];
}

/** Busca vendas e produtos em paralelo para a página de Vendas & Receita. */
export async function fetchVendasEProdutos() {
  const [vendas, produtos] = await Promise.all([fetchAllVendas(), fetchAllProdutos()]);
  return { vendas, produtos };
}
