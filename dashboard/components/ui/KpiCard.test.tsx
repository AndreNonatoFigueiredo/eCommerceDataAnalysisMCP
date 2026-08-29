import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "./KpiCard";
import { ACCENT } from "@/lib/colors";

/**
 * Testes do componente compartilhado KpiCard (dono: Líder/QA).
 * Cobre o contrato documentado em dashboard/TASKS.md > "Cards / KPI":
 * label, valor, delta com seta/cor por tendência, e accent na borda
 * superior. Ver dashboard/components/ui/KpiCard.tsx.
 */
describe("KpiCard", () => {
  test("renderiza label e valor", () => {
    render(<KpiCard label="Receita Total" value="R$ 128.430" />);

    expect(screen.getByText("Receita Total")).toBeInTheDocument();
    expect(screen.getByText("R$ 128.430")).toBeInTheDocument();
  });

  test("não renderiza delta quando não informado", () => {
    render(<KpiCard label="Receita Total" value="R$ 128.430" />);

    expect(screen.queryByText(/vs\./)).not.toBeInTheDocument();
  });

  test("trend 'up' mostra seta ↑ e cor de alta (#0ca30c)", () => {
    render(
      <KpiCard
        label="Receita Total"
        value="R$ 128.430"
        delta="+4,2% vs. mês anterior"
        trend="up"
      />
    );

    const delta = screen.getByText(/\+4,2% vs\. mês anterior/);
    expect(delta.textContent).toContain("↑");
    expect(delta.className).toContain("text-[#0ca30c]");
  });

  test("trend 'down' mostra seta ↓ e cor de queda (#d03b3b)", () => {
    render(
      <KpiCard
        label="Ticket Médio"
        value="R$ 42,50"
        delta="-2,1% vs. mês anterior"
        trend="down"
      />
    );

    const delta = screen.getByText(/-2,1% vs\. mês anterior/);
    expect(delta.textContent).toContain("↓");
    expect(delta.className).toContain("text-[#d03b3b]");
  });

  test("trend 'neutral' (padrão) não mostra seta e usa cor mudo", () => {
    render(
      <KpiCard label="Nº de Pedidos" value="3.020" delta="sem variação" />
    );

    const delta = screen.getByText(/sem variação/);
    // Sem seta de alta/queda quando neutro.
    expect(delta.textContent?.trim().startsWith("sem variação")).toBe(true);
    expect(delta.className).toContain("text-text-muted");
  });

  test("aplica a cor de accent da seção na borda superior", () => {
    const { container } = render(
      <KpiCard label="Receita Total" value="R$ 128.430" accent={ACCENT.vendas} />
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.style.borderTopColor).toBeTruthy();
  });

  test("renderiza children extra (ex: sparkline) abaixo do valor", () => {
    render(
      <KpiCard label="Receita Total" value="R$ 128.430">
        <span data-testid="sparkline">gráfico</span>
      </KpiCard>
    );

    expect(screen.getByTestId("sparkline")).toBeInTheDocument();
  });
});
