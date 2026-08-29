import { supabase } from "@/lib/supabase";
import type { ClienteRow, VendaRow } from "./metrics";

/**
 * Camada de acesso a dados da seção Clientes & Comportamento — usada apenas
 * em Server Components (ver dashboard/app/clientes/page.tsx). Toda a
 * agregação acontece em memória no servidor (ver ./metrics.ts); aqui só
 * trazemos as linhas brutas das tabelas `clientes` e `vendas`.
 */

/** Tamanho máximo de página do PostgREST/Supabase por requisição — respostas
 * sem `.range()` são truncadas nesse limite mesmo pedindo todas as linhas. */
const PAGE_SIZE = 1000;

/**
 * Busca todas as ~3020 linhas de `vendas`, paginando em blocos de 1000 (o
 * client Supabase/PostgREST limita cada resposta a esse tamanho por
 * padrão — sem paginar, os KPIs desta seção seriam calculados sobre menos
 * de 1/3 dos dados reais). O volume é pequeno o suficiente para trazer tudo
 * e agregar em TypeScript em vez de fazer várias queries agregadas no
 * banco.
 */
async function fetchAllVendas(): Promise<VendaRow[]> {
  const vendas: VendaRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("vendas")
      .select(
        "id_venda, data_venda, id_cliente, id_produto, canal_venda, quantidade, preco_unitario"
      )
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

/** `clientes` tem 50 linhas — cabe inteira em uma única página, mas ainda
 * assim é bom não assumir isso silenciosamente caso a tabela cresça. */
async function fetchAllClientes(): Promise<ClienteRow[]> {
  const clientes: ClienteRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id_cliente, nome_cliente, estado, pais, data_cadastro")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Falha ao buscar clientes do Supabase: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    clientes.push(...(data as ClienteRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return clientes;
}

/** Busca clientes e vendas em paralelo para a página de Clientes & Comportamento. */
export async function fetchClientesEVendas() {
  const [clientes, vendas] = await Promise.all([fetchAllClientes(), fetchAllVendas()]);
  return { clientes, vendas };
}
