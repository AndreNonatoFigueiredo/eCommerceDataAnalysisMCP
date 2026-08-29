import { describe, expect, test } from "vitest";
import { ACCENT, CATEGORICAL, STATUS } from "./colors";

/**
 * Testes de sanidade para a paleta compartilhada (dono: Líder/QA).
 * Não valida "correção visual" (isso é responsabilidade da skill de
 * dataviz ao definir a paleta), apenas invariantes estruturais que, se
 * quebradas, indicam edição acidental do arquivo compartilhado.
 */
describe("lib/colors", () => {
  test("ACCENT define uma cor por seção", () => {
    expect(Object.keys(ACCENT).sort()).toEqual(
      ["clientes", "pricing", "vendas"].sort()
    );
    for (const hex of Object.values(ACCENT)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test("CATEGORICAL tem 8 cores únicas na ordem documentada em TASKS.md", () => {
    expect(CATEGORICAL).toHaveLength(8);
    expect(new Set(CATEGORICAL).size).toBe(8);
    expect(CATEGORICAL[0]).toBe(ACCENT.vendas);
    expect(CATEGORICAL[1]).toBe(ACCENT.pricing);
  });

  test("STATUS não reutiliza nenhuma cor de CATEGORICAL/ACCENT", () => {
    const reserved = new Set<string>([
      ...CATEGORICAL,
      ...Object.values(ACCENT),
    ]);
    for (const hex of Object.values(STATUS)) {
      expect(reserved.has(hex)).toBe(false);
    }
  });
});
