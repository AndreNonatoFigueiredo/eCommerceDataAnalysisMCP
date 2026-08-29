import type { ProductRevenue } from "./metrics";
import { formatBRL, formatInt } from "./format";

/**
 * Ranking de top produtos por receita — renderizado no servidor (não
 * precisa de interatividade client-side). Os 20 placeholders "Produto
 * Descontinuado" já vêm excluídos de `data` por `computeTopProdutos`.
 */
export function TopProductsTable({ data }: { data: ProductRevenue[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="py-2 pr-4 font-medium">#</th>
            <th className="py-2 pr-4 font-medium">Produto</th>
            <th className="py-2 pr-4 font-medium">Categoria</th>
            <th className="py-2 pr-4 font-medium">Marca</th>
            <th className="tabular-nums py-2 pr-4 text-right font-medium">Qtde. vendida</th>
            <th className="tabular-nums py-2 pr-0 text-right font-medium">Receita</th>
          </tr>
        </thead>
        <tbody>
          {data.map((produto, index) => (
            <tr key={produto.id_produto} className="border-b border-border-subtle last:border-0">
              <td className="py-2 pr-4 text-text-muted">{index + 1}</td>
              <td className="py-2 pr-4 font-medium text-foreground">{produto.nome}</td>
              <td className="py-2 pr-4 text-text-secondary">{produto.categoria}</td>
              <td className="py-2 pr-4 text-text-secondary">{produto.marca}</td>
              <td className="tabular-nums py-2 pr-4 text-right text-text-secondary">
                {formatInt(produto.quantidade)}
              </td>
              <td className="tabular-nums py-2 pr-0 text-right font-semibold text-foreground">
                {formatBRL(produto.receita, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
