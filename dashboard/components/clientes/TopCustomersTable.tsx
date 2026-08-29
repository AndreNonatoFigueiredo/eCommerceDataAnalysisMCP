import type { ClienteAgregado } from "./metrics";
import { formatCurrency, formatDate, formatNumber } from "./format";

/**
 * Top clientes por receita total (lifetime, no recorte do dataset) — ajuda
 * a responder "quem são os clientes mais valiosos e onde estão".
 */
export function TopCustomersTable({ data }: { data: ClienteAgregado[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="py-2 pr-4 font-medium">Cliente</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium text-right">Compras</th>
            <th className="py-2 pr-4 font-medium text-right">Receita</th>
            <th className="py-2 pr-0 font-medium text-right">
              Última compra
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((cliente, index) => (
            <tr
              key={cliente.id_cliente}
              className={
                index < data.length - 1
                  ? "border-b border-border-subtle"
                  : undefined
              }
            >
              <td className="py-2 pr-4 text-foreground">
                {cliente.nome_cliente}
              </td>
              <td className="py-2 pr-4 text-text-secondary">
                {cliente.estado}
              </td>
              <td className="tabular-nums py-2 pr-4 text-right text-text-secondary">
                {formatNumber(cliente.nVendas)}
              </td>
              <td className="tabular-nums py-2 pr-4 text-right font-medium text-foreground">
                {formatCurrency(cliente.receita)}
              </td>
              <td className="tabular-nums py-2 pr-0 text-right text-text-secondary">
                {formatDate(cliente.ultimaCompra)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
