import { STATUS } from "@/lib/colors";
import type { ProdutoRankingRow } from "./metrics";

interface Props {
  acima: ProdutoRankingRow[];
  abaixo: ProdutoRankingRow[];
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

function RankingList({
  title,
  rows,
  situacao,
}: {
  title: string;
  rows: ProdutoRankingRow[];
  situacao: "acima" | "abaixo";
}) {
  const color = situacao === "acima" ? STATUS.serious : STATUS.good;
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="py-2 pr-3 font-medium">Produto</th>
              <th className="py-2 pr-3 font-medium">Categoria</th>
              <th className="py-2 pr-3 text-right font-medium">Nosso preço</th>
              <th className="py-2 pr-3 text-right font-medium">Concorrência (méd.)</th>
              <th className="py-2 pl-3 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.id_produto} className="border-b border-border-subtle/60 last:border-0">
                <td className="py-2 pr-3 text-foreground">
                  <span className="line-clamp-1">{r.nome_produto}</span>
                  <span className="block text-xs text-text-muted">{r.marca}</span>
                </td>
                <td className="py-2 pr-3 text-text-secondary">{r.categoria}</td>
                <td className="py-2 pr-3 text-right text-text-secondary">{brl(r.precoProprio)}</td>
                <td className="py-2 pr-3 text-right text-text-secondary">
                  {brl(r.precoConcorrenteMedio)}
                </td>
                <td className="py-2 pl-3 text-right font-semibold" style={{ color }}>
                  {pct(r.diffPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Ranking de produtos mais acima e mais abaixo do preço médio da
 * concorrência (excluindo os placeholders "Produto Descontinuado", que não
 * têm concorrência real associada).
 */
export function ProdutoRankingTable({ acima, abaixo }: Props) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <RankingList title="Mais acima do mercado" rows={acima} situacao="acima" />
      <RankingList title="Mais abaixo do mercado" rows={abaixo} situacao="abaixo" />
    </div>
  );
}
