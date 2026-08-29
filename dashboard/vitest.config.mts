import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Config de testes unitários (Vitest + React Testing Library).
 * Ver dashboard/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md
 * (guia oficial para esta versão do Next.js — consultado em vez de
 * confiar em conhecimento prévio, já que o Next 16 tem breaking changes).
 *
 * Dono: QA/Arquiteto. Server Components async não são suportados pelo
 * Vitest — cobrimos aqui apenas componentes síncronos (ex: KpiCard) e
 * lógica pura; fluxos assíncronos ficam para testes E2E (fora de escopo
 * desta primeira passada).
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
});
