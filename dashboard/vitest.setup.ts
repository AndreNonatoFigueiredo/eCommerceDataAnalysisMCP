import "@testing-library/jest-dom/vitest";

/**
 * Vitest não carrega `.env.local` (isso é um comportamento do Next.js
 * runtime, não do Vite/Vitest puro). Alguns módulos de dados (ex:
 * `components/pricing/data.ts`) importam `@/lib/supabase` no topo do
 * arquivo mesmo quando só queremos testar as funções puras de agregação
 * exportadas por eles — e `lib/supabase.ts` lança em import-time se as
 * env vars não existirem, derrubando o arquivo de teste inteiro antes de
 * qualquer `test()` rodar.
 *
 * Fallback só para o ambiente de teste (nunca sobrescreve valores reais,
 * que o Vitest de qualquer forma não carrega): evita esse crash sem fazer
 * nenhuma chamada de rede de verdade — os testes aqui exercitam lógica
 * pura, nunca o client Supabase em si.
 *
 * Ver achado registrado em TASKS.md > "Achados de QA": recomendação para
 * separar I/O (fetch) de agregação pura em `components/pricing/data.ts`,
 * no mesmo padrão já usado por `components/vendas/{data,metrics}.ts` e
 * `components/clientes/metrics.ts` (que não importam `lib/supabase`).
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
