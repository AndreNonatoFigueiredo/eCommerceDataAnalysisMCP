# Dashboard de E-commerce

Dashboard analítico somente-leitura, em Next.js, sobre dados de um projeto
Supabase existente. Cobre três seções de negócio:

- **Vendas & Receita** — `/vendas`
- **Pricing & Margem** — `/pricing`
- **Clientes & Comportamento** — `/clientes`

Os dados vêm de 4 tabelas no schema `public` do Supabase: `clientes`,
`produtos`, `vendas` (tabela fato) e `preco_competidores`. Não há
autenticação de usuário nem escrita no banco — o app apenas lê dados já
carregados.

> Este README é mantido de forma incremental pelo Documentador da equipe,
> em paralelo ao desenvolvimento das três seções. Consulte
> [`TASKS.md`](./TASKS.md) para o board de tarefas completo, o design
> system detalhado e as decisões brutas da equipe.

## Sumário

- [Setup](#setup)
- [Arquitetura e decisões (Fase 1)](#arquitetura-e-decisões-fase-1)
- [Modelo de dados](#modelo-de-dados)
- [Design system (resumo)](#design-system-resumo)
- [Seções de negócio](#seções-de-negócio)
  - [Vendas & Receita](#vendas--receita)
  - [Pricing & Margem](#pricing--margem)
  - [Clientes & Comportamento](#clientes--comportamento)
- [Achados de QA](#achados-de-qa)

## Setup

Pré-requisitos: Node.js compatível com Next.js 16 e acesso ao projeto
Supabase (URL + anon key) já provisionado para este dashboard.

```bash
cd dashboard
npm install
```

### Variáveis de ambiente

Crie (ou confira) o arquivo `dashboard/.env.local` — **já criado neste
projeto e ignorado pelo git** (coberto pelo `.env*` padrão do
`.gitignore` do `create-next-app`) — com:

```bash
NEXT_PUBLIC_SUPABASE_URL=<url-do-projeto-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-publishable-do-projeto>
```

Essas variáveis são consumidas por `dashboard/lib/supabase.ts`, que
exporta o client único do app (`supabase`) — nenhum outro arquivo deve
instanciar um client Supabase próprio.

### Rodando

```bash
npm run dev      # dev server em http://localhost:3000
npm run build    # build de produção
npm run start    # serve o build de produção
npm run lint     # eslint
```

## Arquitetura e decisões (Fase 1)

- **Stack**: Next.js 16 (App Router, TypeScript), Tailwind CSS v4,
  Recharts (gráficos), `@supabase/supabase-js`. Sem diretório `src/`;
  alias de import `@/*`.
- **Somente leitura, sem autenticação**: o app não implementa login nem
  sessão de usuário. Todo o acesso a dados é via `SELECT` usando a chave
  `anon`/publishable do Supabase.
- **RLS (Row Level Security)**: habilitado nas 4 tabelas, com policy
  pública de leitura (`SELECT`) para os papéis `anon` e `authenticated`.
  Não há policies de `INSERT`/`UPDATE`/`DELETE` — a proteção contra
  escrita acontece no banco, não apenas na UI. Alterações de
  schema/policies estão fora do escopo deste app (projeto Supabase
  já existente e populado).
- **Light mode apenas**: não há dark mode neste dashboard; `
  prefers-color-scheme` não deve ser reintroduzido sem alinhamento da
  equipe (ver design system).
- **Propriedade de arquivos**: cada especialista de seção (Vendas,
  Pricing, Clientes) é dono exclusivo de `app/<secao>/page.tsx` e
  `components/<secao>/**`. Arquivos de fundação (`app/layout.tsx`,
  `app/globals.css`, `app/page.tsx`, `lib/supabase.ts`, `lib/colors.ts`,
  `components/ui/KpiCard.tsx`) são mantidos pelo Líder/QA — detalhes em
  [`TASKS.md`](./TASKS.md#convenção-de-arquivos).

## Modelo de dados

Schema `public`, projeto Supabase existente (dados já carregados):

| Tabela | Linhas | Papel | Colunas principais |
|---|---|---|---|
| `clientes` | 50 | dimensão | `id_cliente` (PK), `nome_cliente`, `estado`, `pais`, `data_cadastro` |
| `produtos` | 235 | dimensão | `id_produto` (PK), `nome_produto`, `categoria`, `marca`, `preco_atual`, `data_criacao` |
| `vendas` | 3020 | fato | `id_venda` (PK), `data_venda`, `id_cliente` (FK), `id_produto` (FK), `canal_venda`, `quantidade`, `preco_unitario` |
| `preco_competidores` | 728 | fato (série temporal) | `id` (PK), `id_produto` (FK), `nome_concorrente`, `preco_concorrente`, `data_coleta` |

Observações importantes de qualidade de dados (valem para todas as
seções):

- **20 produtos placeholder** em `produtos` (`"Produto Descontinuado"` /
  `"Desconhecida"`) originados de vendas órfãs. Cada seção decide e
  documenta como trata esses registros (ex.: excluir de rankings por
  categoria/marca, mas manter na receita total agregada).
- **Não existe coluna de valor total pronta em `vendas`** — o valor de
  uma linha de venda é sempre calculado como `quantidade * preco_unitario`.
- `vendas.preco_unitario` é o preço efetivamente praticado na venda;
  `produtos.preco_atual` é o preço de tabela/corrente do produto — os
  dois podem divergir (ver seção Pricing).

## Design system (resumo)

Especificação completa (paleta, tipografia, espaçamento, regras de
gráfico, componente `KpiCard`) em
[`TASKS.md` → "Design System"](./TASKS.md#design-system). Resumo:

- Paleta e helpers centralizados em `dashboard/lib/colors.ts` — sempre
  importar de lá, nunca redeclarar hex codes soltos.
- Cor de destaque (accent) por seção: Vendas = azul `#2a78d6`, Pricing =
  laranja `#eb6834`, Clientes = violeta `#4a3aa7`.
- Paleta categórica fixa (`CATEGORICAL`) para gráficos multi-série, usada
  sempre a partir do primeiro slot, nunca reordenada.
- Cores de status (`STATUS`: good/warning/serious/critical) nunca
  identificam uma série sozinhas — sempre com ícone/seta + label.
- Tipografia: Geist Sans; escala de classes Tailwind fixa para
  título/h2/KPI/labels/corpo/eixos (sem valores arbitrários).
- Espaçamento: escala padrão do Tailwind (`gap-6`, `p-5`/`p-6`, grid de
  KPIs `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- Cards de KPI: sempre via `components/ui/KpiCard.tsx` (compartilhado),
  nunca recriado do zero; variações compõem por cima via `children`.
- Gráficos: Recharts com helpers `CHART_TOOLTIP_STYLE`,
  `CHART_GRID_PROPS`, `CHART_AXIS_PROPS` de `lib/colors.ts`; sem eixo Y
  duplo; legenda obrigatória com 2+ séries.

## Seções de negócio

### Vendas & Receita

Rota: `/vendas` · Accent: azul `#2a78d6` · Dono: teammate Vendas ·
Status: **concluído**

Fontes principais: tudo sobre `vendas` — join em `produtos` usado apenas
para o ranking de Top Produtos (nomes/categoria).

**KPIs finais:**

| KPI | Fórmula | Resultado neste dataset |
|---|---|---|
| Receita Total | `SUM(quantidade * preco_unitario)` | ~R$ 974 mil / 3020 vendas |
| Nº de Pedidos | `COUNT(id_venda)` | 3020 |
| Ticket Médio | `Receita Total / Nº de Pedidos` | — |
| Participação do Canal Líder | receita do canal / receita total, `GROUP BY canal_venda` | e-commerce ~72% / loja física ~28% (únicos 2 canais) |
| Evolução Diária de Receita | receita por dia (granularidade **diária**, não mensal) | período: 13/12/2025–11/01/2026 |
| Receita por Dia da Semana | receita agrupada por dia da semana | fins de semana ~15–20% acima da média |
| Top 10 Produtos por Receita | `SUM(quantidade * preco_unitario)` por produto, `GROUP BY id_produto`, join em `produtos` | exclui os 20 produtos placeholder do ranking |

**Notas importantes:**

- **Ticket Médio é por pedido**, distinto do "Ticket Médio por Cliente"
  (lifetime, receita total do cliente / clientes ativos) da seção
  Clientes & Comportamento — os dois números não são comparáveis
  diretamente, ver nota lá também.
- **Evolução Diária de Receita é deliberadamente diária, não mensal**: o
  dataset cobre apenas ~30 dias corridos (13/12/2025–11/01/2026),
  cruzando a virada do mês. Uma agregação mensal geraria só 2 pontos
  parciais e sugeriria visualmente uma "queda" de receita que seria
  apenas um artefato de corte de período, não um sinal real.
- **Top 10 Produtos exclui os 20 produtos placeholder** do ranking (mas
  eles continuam entrando nos KPIs agregados e na série temporal, pois
  representam vendas reais só com metadado de produto órfão). Impacto
  marginal: ~R$ 4,2 mil de ~R$ 974 mil de receita total.

**Gotcha de arquitetura a conhecer antes de mexer no código**:
`components/vendas/data.ts` faz **fetch paginado** de `vendas` — a
tabela tem 3020 linhas, e o limite padrão de uma requisição
PostgREST/Supabase é 1000 linhas. Uma query sem paginação retorna
silenciosamente só as primeiras 1000 linhas (sem erro), o que
sub-representaria receita/contagens em ~67%. Qualquer nova query direta
a `vendas` (aqui ou em outra seção) precisa considerar o mesmo limite.

**Entregáveis**: `app/vendas/page.tsx`,
`components/vendas/{data,metrics,format}.ts` e componentes de
visualização `RevenueTrendChart`, `RevenueByChannelChart`,
`RevenueByWeekdayChart`, `TopProductsTable`.

### Pricing & Margem

Rota: `/pricing` · Accent: laranja `#eb6834` · Dono: teammate Pricing ·
Status: **concluído**

Fontes principais: `produtos.preco_atual` (preço de tabela corrente),
`vendas.preco_unitario` (preço efetivamente praticado),
`preco_competidores.preco_concorrente` (preço da concorrência ao longo
do tempo, via `data_coleta`). Todos os KPIs **excluem os 20 produtos
placeholder** — confirmado que eles têm 0 registros em
`preco_competidores`, então não haveria comparação de mercado possível
de qualquer forma.

**KPIs finais:**

| KPI | Fórmula | Resultado neste dataset |
|---|---|---|
| Desconto Médio Praticado | `AVG(1 - vendas.preco_unitario/produtos.preco_atual)` | ~3,1% |
| Posição Média vs. Concorrência | `AVG((preco_atual - média_concorrentes) / média_concorrentes)` sobre produtos comparáveis | ~+7,4% (em média mais caro que a concorrência), 215 produtos comparáveis |
| Produtos Acima/Abaixo do Mercado | contagem por faixa de diferença vs. média dos concorrentes | 127 acima / 82 abaixo / 6 empatados |
| Evolução do Preço da Concorrência | `AVG(preco_concorrente)` por concorrente e faixa horária | intradiário — `data_coleta` cobre só 1 dia-calendário (11/01/2026) |

**Notas importantes:**

- **Sem coluna de custo/margem contábil real** no schema — "margem"
  aqui é sempre percebida/relativa (desconto vs. preço de tabela,
  posição vs. concorrência), nunca margem de lucro. Esta limitação é
  explicitada **na própria UI** via componente `MethodologyNote`, não
  apenas em comentário de código ou nesta doc.
- **Evolução da concorrência é intradiária, não uma série de longo
  prazo**: `preco_competidores.data_coleta` cobre um único dia-calendário
  (11/01/2026), então o gráfico mostra variação por faixa horária dentro
  desse dia, não tendência ao longo de semanas/meses.

**Achado de negócio em aberto (não resolvido — validar com o time de
negócio):** a categoria **"Tênis"** aparece com preço próprio
(`preco_atual`) ~2x o preço de **todos os 4 concorrentes**, em **100%**
dos seus produtos — muito destoante das demais categorias, que ficam
entre -0,1% e +1,4% de diferença vs. concorrência. Pode ser
posicionamento de preço premium intencional ou um erro de carga de
dados (ex.: unidade de preço diferente, categoria mal mapeada). Fica
registrado aqui como achado a confirmar, não como fato assumido pelo
dashboard.

**Entregáveis**: `app/pricing/page.tsx`, `components/pricing/data.ts` e
componentes `CategoriaPositionChart`, `CategoriaPriceComparisonChart`,
`CompetitorIntradayChart`, `ProdutoRankingTable`, `MethodologyNote`.

### Clientes & Comportamento

Rota: `/clientes` · Accent: violeta `#4a3aa7` · Dono: teammate Clientes ·
Status: **concluído**

Fontes principais: `clientes` (todas as colunas) e `vendas` agregada por
`id_cliente` (contagem de pedidos, receita, recência, frequência).
Geografia via `clientes.estado`/`clientes.pais`; recência/retenção a
partir de `vendas.data_venda` (ver nota sobre data de referência abaixo).

A página conta a história "quem são os clientes, de onde vêm, com que
frequência compram, estamos retendo".

**KPIs finais:**

| KPI | Fórmula | Resultado neste dataset |
|---|---|---|
| Clientes Ativos | `COUNT(DISTINCT vendas.id_cliente)` | 50/50 (100% da base tem ≥1 venda) |
| Frequência Média de Compra | `COUNT(vendas.id_venda) / Clientes Ativos` | — |
| Ticket Médio por Cliente | `SUM(quantidade * preco_unitario) / Clientes Ativos` | — (lifetime, ver nota abaixo) |
| Recência Média | `AVG(dataReferencia - última compra do cliente)`, em dias | — |
| Retenção Multi-Mês | % de clientes com compra em 2+ meses-calendário distintos | 100% neste dataset |
| Distribuição Geográfica | Clientes agrupados por `estado` | 22 estados, todos BR |

**Notas importantes para interpretar estes números:**

- **Ticket Médio por Cliente é lifetime**, não confundir com o "ticket
  médio" da seção Vendas & Receita — este último é *por pedido*
  (`Receita Total / Nº de Pedidos`), enquanto o de Clientes é a receita
  total gerada por cliente ao longo de todo o histórico, dividida pelo
  número de clientes ativos.
- **Recência usa uma data de referência fixa do dataset**, não a data
  real do sistema: `dataReferencia = MAX(vendas.data_venda)` de toda a
  base. O dataset é um snapshot fixo (dez/2025–jan/2026) — isso é
  intencional para manter os números estáveis e reprodutíveis, mas
  significa que "recência" aqui não reflete quantos dias se passaram
  até hoje, e sim até o fim do período coberto pelos dados.
- Com 50/50 clientes ativos e 100% de retenção multi-mês, este dataset
  não tem clientes inativos ou "de compra única" para contrastar — os
  gráficos de distribuição (histograma de frequência, geografia) são a
  forma principal de encontrar variação entre clientes.

**Entregáveis**: `app/clientes/page.tsx`,
`components/clientes/{metrics,format}.ts` (cálculo e formatação dos
KPIs) e componentes de visualização `GeoDistributionChart`,
`HistogramChart`, `TopCustomersTable` (mais `SectionCard` como wrapper de
layout).

## Achados de QA

Auditoria completa concluída pelo QA/Arquiteto: **44/44 testes
passando, build e lint limpos, nenhum achado crítico ou alto em
aberto**. Resumo dos pontos relevantes para quem for rodar ou manter o
projeto — tabela completa de achados sempre em
[`TASKS.md`](./TASKS.md#achados-de-qa):

**Bugs encontrados e corrigidos:**

- **Truncamento silencioso de dados em Clientes**: o fetch de `vendas`
  usado pela seção Clientes não paginava, então o PostgREST truncava o
  resultado em 1000 de 3020 linhas (mesmo limite/gotcha já documentado
  na seção Vendas acima). Corrigido aplicando o mesmo padrão de
  paginação via `.range()` em blocos de 1000. Os KPIs de Clientes
  documentados nesta página não mudaram, pois já haviam sido validados
  independentemente via SQL direto no Supabase.
- **Tipagem do Recharts v3** (`Tooltip` `formatter`/`labelFormatter`):
  incompatibilidade de tipos encontrada e corrigida em Vendas e
  Clientes. Pricing nunca apresentou o problema.

**Cobertura de testes**: stack Vitest + React Testing Library, 44
testes cobrindo `KpiCard`, `lib/colors.ts` e as fórmulas de agregação
das 3 seções de negócio.

**Itens de baixa severidade** (não bloqueantes, em correção):

- `components/pricing/data.ts` sendo separado em `data.ts`/`metrics.ts`
  para ficar consistente com o padrão de Vendas e Clientes.
- Algumas cores hardcoded substituídas pelas constantes de
  `lib/colors.ts`.
- **Nota arquitetural a ter em mente ao operar o app**: as páginas são
  estáticas — pré-renderizadas no build, sem `revalidate`. Isso é
  aceitável para o dataset atual (um snapshot fixo, não dados ao vivo),
  mas significa que **qualquer atualização no banco só aparece no
  dashboard após um novo deploy/build**, não automaticamente.
