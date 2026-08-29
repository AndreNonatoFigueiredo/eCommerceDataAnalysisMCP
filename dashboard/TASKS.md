# TASKS — Dashboard de E-commerce

Board compartilhado por toda a equipe (Líder/Fundação, Vendas, Pricing,
Clientes, QA/Arquiteto, Documentador). Leia isto inteiro antes de começar.
Atualize sua linha na tabela de status conforme avança e **ao terminar sua
seção, marque "done" aqui E envie uma mensagem via SendMessage para "main"
avisando que terminou.**

## Como rodar o app

```bash
cd dashboard
npm run dev
```

Abre em `http://localhost:3000`. Build de produção: `npm run build`. Lint:
`npm run lint`.

## Banco de dados (Supabase)

Projeto já existente, dados já carregados, RLS habilitado com policy
pública de leitura (SELECT) para `anon`/`authenticated` nas 4 tabelas —
**somente leitura, não há escrita no app**. Não altere policies/schema.

Client já configurado em `dashboard/lib/supabase.ts` (usa
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` de
`dashboard/.env.local`, já criado e ignorado pelo git). Importe `supabase`
desse arquivo — não crie outro client.

### Schema (schema `public`)

- **clientes** (50 linhas): `id_cliente` (text, PK), `nome_cliente` (text),
  `estado` (text), `pais` (text), `data_cadastro` (timestamptz)
- **produtos** (235 linhas — atenção: 20 são placeholders "Produto
  Descontinuado"/"Desconhecida" criados por dados órfãos; considere
  filtrar ou tratar visualmente): `id_produto` (text, PK), `nome_produto`
  (text), `categoria` (text), `marca` (text), `preco_atual` (numeric),
  `data_criacao` (timestamptz)
- **vendas** (3020 linhas, tabela fato): `id_venda` (text, PK),
  `data_venda` (timestamptz), `id_cliente` (text, FK→clientes),
  `id_produto` (text, FK→produtos), `canal_venda` (text), `quantidade`
  (int4), `preco_unitario` (numeric)
- **preco_competidores** (728 linhas): `id` (bigint, PK), `id_produto`
  (text, FK→produtos), `nome_concorrente` (text), `preco_concorrente`
  (numeric), `data_coleta` (timestamptz)

### Mapeamento de domínio → seção do dashboard

| Seção | Tabelas/colunas principais | Observações |
|---|---|---|
| **Vendas & Receita** | `vendas` (todas as colunas) + join em `clientes` (nome/estado/país) e `produtos` (nome/categoria/marca) para labels e quebras analíticas | `vendas.preco_unitario` é o preço efetivamente praticado na venda (pode diferir de `produtos.preco_atual`, que é o preço "atual"/corrente do produto) |
| **Pricing & Margem** | `produtos.preco_atual` (preço de tabela corrente), `vendas.preco_unitario` (preço efetivamente praticado), `preco_competidores.preco_concorrente` (preço da concorrência ao longo do tempo, via `data_coleta`) | Não há coluna de custo/margem contábil real — "margem" aqui é **margem percebida/relativa**: diferença percentual entre preço próprio e concorrência, e desconto entre preço de tabela e preço praticado. Documente essa limitação nos KPIs |
| **Clientes & Comportamento** | `clientes` (todas as colunas) + `vendas` agregada por `id_cliente` (contagem de pedidos, receita, recência, frequência) | Geografia via `clientes.estado`/`clientes.pais`. Retenção/recência a partir de `data_cadastro` vs. datas em `vendas.data_venda` |

Cuidados de qualidade de dados a considerar em todas as seções:
- Os 20 produtos placeholder ("Produto Descontinuado"/"Desconhecida") em
  `produtos` vêm de vendas órfãs — decida e documente como cada seção os
  trata (ex: excluir de rankings por categoria/marca, mas manter na
  receita total).
- Sempre tratar `quantidade * preco_unitario` como o valor de uma linha
  de venda (não existe coluna de valor total pronta em `vendas`).

---

## Design System

Aplicar em TODAS as seções sem ambiguidade. Se algo não estiver coberto
aqui, pergunte antes de inventar um padrão novo (mensagem para "main").

### Paleta de cores

Baseada na paleta de dataviz validada (contraste e distinção entre séries
já verificados — ver skill `dataviz` do Claude Code se for alterar).
**Light mode apenas — este dashboard não tem dark mode.** Não reintroduza
`prefers-color-scheme` sem alinhar com o time.

Todas as constantes estão em `dashboard/lib/colors.ts` — **importe de lá**,
não redeclare hex codes soltos nos componentes.

| Papel | Hex | Uso |
|---|---|---|
| Fundo da página | `#f9f9f7` | `bg-background` |
| Texto principal | `#0b0b0b` | `text-foreground` |
| Superfície de card | `#ffffff` | `bg-surface-card` |
| Borda sutil | `rgba(11,11,11,0.10)` | `border-border-subtle` |
| Texto secundário | `#52514e` | `text-text-secondary` |
| Texto mudo (eixos/labels) | `#898781` | `text-text-muted` |
| Gridline de gráfico | `#e1e0d9` | usar via `lib/colors.ts` `CHART_CHROME.gridline` |

**Cor de destaque por seção** (accent) — usada em borda superior de card,
links ativos, e como cor da "série 1" em gráficos daquela seção:

| Seção | Accent | Hex |
|---|---|---|
| Vendas & Receita | azul | `#2a78d6` |
| Pricing & Margem | laranja | `#eb6834` |
| Clientes & Comportamento | violeta | `#4a3aa7` |

Importar de `ACCENT.vendas` / `ACCENT.pricing` / `ACCENT.clientes` em
`dashboard/lib/colors.ts`.

**Paleta categórica para gráficos multi-série** (ordem fixa, nunca
reordenar/ciclar — usar sempre a partir do slot 1):

`#2a78d6` (blue) → `#eb6834` (orange) → `#1baf7a` (aqua) → `#eda100`
(yellow) → `#e87ba4` (magenta) → `#008300` (green) → `#4a3aa7` (violet) →
`#e34948` (red)

Exportada como array `CATEGORICAL` em `lib/colors.ts`. Para gráficos tipo
scatter/bubble/small-multiples com muitas séries, limitar aos 3 primeiros
slots e agrupar o resto em "Outros".

**Cores de status** (fixas, nunca usar para identificar uma série —
sempre com ícone/seta + label, nunca só a cor):

| Papel | Hex |
|---|---|
| good (alta/positivo) | `#0ca30c` |
| warning | `#fab219` |
| serious | `#ec835a` |
| critical (queda/negativo) | `#d03b3b` |

Exportadas como `STATUS` em `lib/colors.ts`.

### Tipografia

- Fonte: Geist Sans (já configurada via `next/font/google` em
  `app/layout.tsx`, disponível como fonte padrão do body). Não trocar.
- Escala (usar estas classes Tailwind, não valores arbitrários):
  - Título de página (`h1`): `text-2xl md:text-3xl font-bold tracking-tight`
  - Título de seção/card (`h2`): `text-lg font-semibold`
  - Valor de KPI (número grande): `text-3xl font-bold tabular-nums`
  - Label de KPI: `text-sm font-medium uppercase tracking-wide text-text-secondary`
  - Texto de corpo: `text-sm text-text-secondary`
  - Eixos/labels de gráfico: `text-xs` cor `#898781`
- Números grandes (KPIs) usam algarismos proporcionais por padrão; use a
  classe utilitária `.tabular-nums` (definida em `globals.css`) apenas
  quando precisar alinhar números em coluna (ex: tabelas).

### Espaçamento

Seguir a escala padrão do Tailwind — não usar valores mágicos (`px-[17px]`
etc.):
- Padding de página: `px-6 py-8 md:px-8` (já aplicado em `app/layout.tsx`,
  não precisa repetir nas páginas de seção)
- Gap entre cards/seções: `gap-6` (24px)
- Padding interno de card: `p-5` ou `p-6`
- Grid de KPIs: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`

### Cards / KPI

Usar o componente compartilhado `dashboard/components/ui/KpiCard.tsx` —
**não recriar o card do zero em cada seção**. Ele já aplica: fundo branco,
borda sutil, sombra leve (`shadow-sm`), cantos arredondados (`rounded-xl`),
label pequeno em maiúsculas, número grande em negrito, variação percentual
colorida (verde `#0ca30c` para alta / vermelho `#d03b3b` para queda) com
seta, e uma barra de destaque (`accent`) na borda superior com a cor da
seção.

```tsx
import { KpiCard } from "@/components/ui/KpiCard";
import { ACCENT } from "@/lib/colors";

<KpiCard
  label="Receita Total"
  value="R$ 128.430"
  delta="+4,2% vs. mês anterior"
  trend="up"
  accent={ACCENT.vendas}
/>
```

Se precisar de uma variação (ex: KPI com sparkline), componha em volta do
`KpiCard` (prop `children`) dentro da sua própria pasta
`components/<secao>/`, não edite o componente compartilhado sem coordenar.

### Gráficos (Recharts)

Recharts é a biblioteca oficial de gráficos do projeto. Usar os helpers de
`dashboard/lib/colors.ts` para manter tooltip/grid/eixos consistentes entre
seções:

```tsx
import {
  CHART_TOOLTIP_STYLE,
  CHART_GRID_PROPS,
  CHART_AXIS_PROPS,
  ACCENT,
  CATEGORICAL,
} from "@/lib/colors";

<CartesianGrid {...CHART_GRID_PROPS} />
<XAxis dataKey="mes" {...CHART_AXIS_PROPS} />
<YAxis {...CHART_AXIS_PROPS} />
<Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
<Line dataKey="receita" stroke={ACCENT.vendas} strokeWidth={2} dot={false} />
```

Regras:
- Gráfico de 1 série: usar a cor `ACCENT` da própria seção.
- Gráfico multi-série: usar `CATEGORICAL` na ordem fixa, começando do
  slot 1 — nunca escolher cores aleatórias/ciclar a paleta.
- Sempre incluir legenda quando houver 2+ séries (nenhuma legenda
  necessária para série única — o título já identifica).
- Nunca usar eixo Y duplo (dual-axis). Duas métricas de escalas diferentes
  → dois gráficos, ou small multiples, ou indexar a uma base comum.
- Grid apenas horizontal (`vertical: false`, já no `CHART_GRID_PROPS`).
  **Exceção aprovada (QA/Arquiteto):** em gráficos de barra horizontal
  (`layout="vertical"` do Recharts, categorias no eixo Y — ex:
  `components/clientes/GeoDistributionChart.tsx`), inverter para
  `horizontal={false} vertical` é o correto, já que aí é o eixo X que
  carrega a escala numérica que as gridlines precisam acompanhar.
- Tooltip sempre com `CHART_TOOLTIP_STYLE`.

### Convenção de arquivos

| Caminho | Dono | Regra |
|---|---|---|
| `app/layout.tsx` | Líder/QA | Não editar sem coordenar (mensagem para "main") |
| `app/globals.css` | Líder/QA | Não editar sem coordenar |
| `app/page.tsx` (home) | Líder/QA | Não editar sem coordenar |
| `lib/supabase.ts` | Líder/QA | Não editar sem coordenar |
| `lib/colors.ts` | Líder/QA | Não editar sem coordenar — só importar |
| `components/ui/KpiCard.tsx` | Líder/QA | Não editar sem coordenar — compor por cima se precisar de variação |
| `app/vendas/page.tsx` + `components/vendas/**` | **Teammate Vendas** | Livre para editar |
| `app/pricing/page.tsx` + `components/pricing/**` | **Teammate Pricing** | Livre para editar |
| `app/clientes/page.tsx` + `components/clientes/**` | **Teammate Clientes** | Livre para editar |
| `TASKS.md` | Todos | Cada um atualiza sua própria linha de status |

Ninguém deve editar o arquivo/pasta de outro especialista, nem os arquivos
marcados "Líder/QA", sem antes coordenar via mensagem.

---

## Tarefas por teammate

Atualize a coluna **Status** (`todo` / `in-progress` / `done`) conforme
avança. Ao concluir sua seção: marque `done` aqui **e** envie uma
mensagem via SendMessage para **"main"** avisando que terminou (inclua um
resumo curto do que foi entregue e qualquer decisão/limite relevante).

| Teammate | Tarefas | Status |
|---|---|---|
| **Vendas** | 1) Definir KPIs de Vendas & Receita (nome, fórmula, fonte/tabela-coluna) — sugestões: Receita Total (`SUM(quantidade*preco_unitario)`), Nº de Pedidos (`COUNT(DISTINCT id_venda)`), Ticket Médio (`Receita Total / Nº de Pedidos`), Receita por Canal (`GROUP BY canal_venda`), Evolução mensal de receita (`GROUP BY date_trunc('month', data_venda)`). 2) Construir `app/vendas/page.tsx` + componentes em `components/vendas/` seguindo o design system. 3) Documentar fórmulas finais no TASKS.md ou entregar ao Documentador | `done` — KPIs finais (fórmula · fonte): **Receita Total** = `SUM(vendas.quantidade*vendas.preco_unitario)` · `vendas`, todas as vendas incluídas (R$ ≈ 974 mil, 3020 vendas); **Nº de Pedidos** = `COUNT(vendas.id_venda)` · `vendas` (`id_venda` é PK — cada linha já é uma venda atômica, não há conceito de "pedido com múltiplos itens" no schema, logo `COUNT(*) = COUNT(DISTINCT id_venda)`); **Ticket Médio** = `Receita Total / Nº de Pedidos`; **Participação do Canal Líder** = `SUM(receita do canal) / SUM(receita total)` `GROUP BY vendas.canal_venda` (e-commerce ≈ 72% vs. loja física ≈ 28%, únicos 2 canais existentes), com delta em pontos percentuais entre a 2ª e a 1ª metade do período; **Evolução Diária de Receita** = `SUM(receita) GROUP BY date_trunc('day', data_venda)` — **por dia, não por mês**: os dados cobrem só ~30 dias corridos (13/12/2025 a 11/01/2026), então uma quebra mensal geraria só 2 pontos parciais (dez incompleto + jan incompleto), contando uma história falsa de "queda" na virada do mês; **Receita por Dia da Semana** = `SUM(receita) GROUP BY extract(dow from data_venda)` — evidencia sazonalidade intrassemanal (fins de semana com receita ~15-20% acima da média); **Top Produtos por Receita** = `SUM(receita) GROUP BY id_produto` + join em `produtos` para nome/categoria/marca, `ORDER BY receita DESC LIMIT 10`. Tratamento dos 20 produtos placeholder ("Produto Descontinuado", `categoria`/`marca` = "Desconhecida", vindos de vendas órfãs): **mantidos** em Receita Total, Nº de Pedidos, Ticket Médio, Receita por Canal e na série temporal (são vendas reais que aconteceram — só o cadastro do produto se perdeu; impacto marginal: 20 de 3020 vendas, ~R$ 4,2 mil de ~R$ 974 mil); **excluídos** do ranking de Top Produtos (não são acionáveis). Comparações de tendência dos KpiCards usam 2ª metade vs. 1ª metade dos dias com venda do próprio período disponível, já que não existe período anterior completo nos dados para comparar mês a mês. Construído em `app/vendas/page.tsx` (Server Component, fetch paginado de `vendas` — 3020 linhas em blocos de 1000 — + fetch de `produtos` em paralelo via `@/lib/supabase`, agregação toda em TypeScript) + `components/vendas/` (`data.ts` fetch, `metrics.ts` agregações puras, `format.ts` formatação pt-BR, `RevenueTrendChart.tsx`/`RevenueByChannelChart.tsx`/`RevenueByWeekdayChart.tsx` gráficos Recharts, `TopProductsTable.tsx`). 4 KpiCards no topo + gráfico de linha (evolução diária) + 2 gráficos de barra (canal, dia da semana) + tabela Top 10 produtos. `npm run lint` e `npm run build` do projeto completo passam (ver correção de tipagem do `<Tooltip>` do Recharts v3 abaixo). |
| **Pricing** | 1) Definir KPIs de Pricing & Margem (nome, fórmula, fonte) — sugestões: Desconto Médio Praticado (`AVG(1 - vendas.preco_unitario/produtos.preco_atual)`), Posição vs. Concorrência (`AVG(produtos.preco_atual - preco_competidores.preco_concorrente)` ou % acima/abaixo), Produtos Acima/Abaixo do Mercado (contagem por faixa de diferença), Variação de preço da concorrência ao longo do tempo (`GROUP BY data_coleta`). Deixar explícito que não há custo contábil — "margem" é relativa/percebida. 2) Construir `app/pricing/page.tsx` + `components/pricing/`. 3) Documentar fórmulas finais | `done` — **Sem coluna de custo/margem contábil real no banco**: todos os KPIs abaixo são leituras relativas (desconto de tabela e posição frente à concorrência), deixado explícito também numa nota de metodologia na própria UI. Os 20 produtos placeholder ("Produto Descontinuado"/categoria "Desconhecida", de vendas órfãs) são excluídos de TODOS os KPIs/gráficos/tabela desta seção — confirmado por SQL que eles têm 0 registros em `preco_competidores`. KPIs finais (fórmula · fonte): **Desconto Médio Praticado** = `AVG(1 - vendas.preco_unitario/produtos.preco_atual)` · `vendas` join `produtos`, só produtos não-placeholder (resultado no dataset: ≈3,1% sobre ~3000 vendas); **Posição Média vs. Concorrência** = para cada produto, `preco_concorrente_medio = AVG(preco_competidores.preco_concorrente)` (média entre os 4 marketplaces monitorados), depois `AVG((produtos.preco_atual - preco_concorrente_medio)/preco_concorrente_medio)` entre os produtos comparáveis (≈+7,4% no dataset — em média estamos mais caros); **Produtos Acima/Abaixo do Mercado** = contagem de produtos com `diffPct > 0` / `diffPct < 0` sobre os 215 produtos comparáveis (produto entra na base "comparável" se tiver ≥1 registro em `preco_competidores`; todos os 215 não-placeholder têm) — resultado: 127 acima / 82 abaixo / 6 empatados; **Evolução do preço da concorrência** = `AVG(preco_concorrente) GROUP BY nome_concorrente, faixa_horaria(data_coleta)` · `preco_competidores` — **achado de dados**: `data_coleta` cobre um único dia-calendário (2026-01-11 00:05 a 23:58), não há histórico de meses, então virou uma evolução *intradiária* por concorrente (buckets de 6h) em vez de uma tendência de longo prazo; isso está explicitado na legenda do gráfico para não induzir a uma leitura de tendência que os dados não sustentam. **Achado de dados adicional (útil para a narrativa)**: a categoria "Tênis" tem `preco_atual` sistematicamente ≈2x o preço de todos os 4 concorrentes em 100% dos seus produtos (diferença média +100%) — destoa fortemente das outras categorias (que ficam entre -0,1% e +1,4%) e aparece como a barra dominante no gráfico de posição por categoria; vale investigação de dado/produto pela área de negócio. Construído em `app/pricing/page.tsx` (Server Component único, `fetchPricingDataset()` busca `produtos`+`preco_competidores`+`vendas` em paralelo com paginação `.range()` — necessária porque `vendas` tem 3020 linhas e o PostgREST limita a 1000/req — e agrega tudo em memória) + `components/pricing/`: `data.ts` (só fetch — tipos das linhas brutas + `fetchPricingDataset`), `metrics.ts` (todas as agregações puras: `isPlaceholderProduct`, `computePricingKpis`, `computeCategoriaPricing`, `computeIntradayCompetitorSeries`, `computeProdutoRanking`), `metrics.test.ts` (testes do QA), `MethodologyNote.tsx` (aviso de limitação), `CategoriaPositionChart.tsx` (barras: desconto x posição, % por categoria), `CategoriaPriceComparisonChart.tsx` (barras: preço próprio x concorrência em R$ por categoria), `CompetitorIntradayChart.tsx` (linha: 4 concorrentes x 4 janelas horárias), `ProdutoRankingTable.tsx` (top 8 mais acima/mais abaixo do mercado). Os 3 componentes de gráfico já nasceram sem a anotação de tipo explícita no `formatter` do `<Tooltip>` do Recharts v3 — pegadinha avisada por "main"/QA. **QA (passada dedicada):** sem achados críticos/altos; 2 achados triviais corrigidos: (1) `data.ts` misturava fetch com agregação, diferente do padrão `data.ts`/`metrics.ts` de Vendas/Clientes (quebrava os testes do QA) — extraídas todas as funções puras para `metrics.ts` (só fetch fica em `data.ts`), imports dos componentes e do `page.tsx` atualizados, teste renomeado de `data.test.ts` para `metrics.test.ts` com imports corrigidos; (2) `CategoriaPositionChart.tsx` tinha `stroke="#c3c2b7"` hardcoded na `<ReferenceLine>` duplicando `CHART_CHROME.baseline` de `lib/colors.ts` — trocado pela constante. `npm run lint`, `npm run test:run` (44/44 passando) e `npm run build` do projeto inteiro revalidados após as mudanças — sem erros. |
| **Clientes** | 1) Definir KPIs de Clientes & Comportamento (nome, fórmula, fonte) — sugestões: Total de Clientes Ativos (com pelo menos 1 venda), Frequência Média de Compra (`COUNT(vendas)/cliente`), Ticket Médio por Cliente, Recência (dias desde a última compra), Distribuição geográfica (`GROUP BY estado`/`pais`), Retenção (clientes com compra em 2+ meses distintos). 2) Construir `app/clientes/page.tsx` + `components/clientes/`. 3) Documentar fórmulas finais | `done` — KPIs finais (fórmula · fonte): **Clientes Ativos** = `COUNT(DISTINCT vendas.id_cliente)` · `vendas` (resultado: 50/50 = 100% da base cadastrada tem ≥1 venda neste dataset); **Frequência Média de Compra** = `COUNT(vendas.id_venda) / Clientes Ativos` · `vendas` (cada linha de `vendas` é uma venda distinta, `id_venda` é PK); **Ticket Médio por Cliente** = `SUM(vendas.quantidade*vendas.preco_unitario) / Clientes Ativos` · `vendas` (receita lifetime por cliente — não confundir com o "Ticket Médio por Pedido" da seção Vendas); **Recência Média** = `AVG(dataReferencia - MAX(vendas.data_venda) por cliente)` em dias, também agregada em faixas (0/1/2/3–6/7–13/14–29/30+ dias) · `vendas`, onde `dataReferencia = MAX(vendas.data_venda)` de toda a base (não a data atual do sistema — dataset é snapshot histórico fixo, 2025-12-13 a 2026-01-11, então usar "hoje" real inflaria artificialmente a inatividade de todos os clientes); **Retenção Multi-Mês** = `COUNT(clientes com ≥2 meses-calendário distintos de compra, via date_trunc('month', data_venda)) / Clientes Ativos` · `vendas` (resultado: 100% neste dataset, pois todos os 50 clientes compraram tanto em dez/2025 quanto em jan/2026); **Distribuição Geográfica** = `COUNT(*) GROUP BY clientes.estado` · `clientes` (22 estados, todos no Brasil); **Estados Atendidos** = `COUNT(DISTINCT clientes.estado)` entre clientes ativos. Construído em `app/clientes/page.tsx` (Server Component, busca via `components/clientes/data.ts::fetchClientesEVendas`, agregação em memória) + `components/clientes/` (`data.ts` com o fetch paginado, `metrics.ts` com a lógica pura de agregação/bucketing, `format.ts`, `GeoDistributionChart.tsx`, `HistogramChart.tsx` reaproveitado para recência e frequência, `TopCustomersTable.tsx`, `SectionCard.tsx`). 6 KPIs no topo + gráfico geográfico (barras horizontais por estado) + 2 histogramas (recência, frequência) + tabela Top 10 clientes por receita. `npm run lint` e `npm run build` passam (build do projeto inteiro OK, incluindo as 3 seções). **Bug encontrado e corrigido (mesmo achado do QA/Vendas):** a primeira versão de `page.tsx` buscava `vendas` direto com `supabase.from("vendas").select(...)` sem `.range()`, e o PostgREST/Supabase trunca respostas em 1000 linhas por padrão — como `vendas` tem 3020 linhas, os KPIs seriam calculados sobre menos de 1/3 dos dados reais. Corrigido movendo o fetch para `components/clientes/data.ts`, paginando `vendas` em blocos de 1000 via `.range()` (mesmo padrão de `components/vendas/data.ts`) até esgotar as páginas; `clientes` (50 linhas) também passou a usar o mesmo helper por consistência, embora caiba em 1 página. As fórmulas e os resultados numéricos documentados acima **não mudaram**, pois haviam sido verificados originalmente com SQL direto no Postgres (via MCP `execute_sql`), que não sofre esse limite de 1000 linhas da API — só a implementação do fetch no app estava truncada; após o fix, o app recalcula sobre as 3020 linhas e bate com os valores documentados. **QA (2ª passada):** revalidou o fix de paginação (OK) e apontou 1 achado trivial — `text-[#d03b3b]` hardcoded na mensagem de erro de `page.tsx` em vez de `STATUS.critical` de `lib/colors.ts`. Corrigido: import de `STATUS`, cor agora aplicada via `style={{ color: STATUS.critical }}` (mantido como `style` inline, não classe Tailwind, pois classes arbitrárias não podem referenciar uma constante em runtime). `npm run lint` e `npm run build` (projeto inteiro) revalidados após a mudança — sem erros. |
| **QA/Arquiteto** | Conforme cada seção fica pronta (acompanhar este arquivo): revisar código, rodar `npm run build`/`npm run lint`, checar que não há segredos expostos no client, checar que nenhuma seção faz escrita no Supabase (somente SELECT), checar consistência com o design system (cores/tipografia/espaçamento), checar performance de queries (evitar N+1, preferir agregações). Reportar achados no TASKS.md e via mensagem ao dono da seção | `done` — 1ª passada (fundação) + passadas dedicadas de Vendas, Pricing e Clientes concluídas. `npm run lint`/`npm run build`/`npm run test:run` (44/44) do projeto inteiro passam limpos. Ver tabela "Achados de QA": nenhum achado crítico/alto em aberto; achados médios/baixos (itens 7–9) confirmados corrigidos e achados de decisão (itens 10, 12) confirmados aceitos pelo Líder na Fase 3 — Integração (ver seção abaixo). |
| **Documentador** | Documentação incremental à medida que as seções avançam: decisões de arquitetura, KPIs definidos por cada teammate (com fórmula e fonte), instruções de setup (`.env.local`, `npm run dev`), achados de QA. Manter um `README.md` do dashboard atualizado | `done` — `dashboard/README.md` cobre setup, decisões de arquitetura/RLS, modelo de dados, resumo do design system (com link para a spec completa aqui), os KPIs finais das 3 seções (Vendas, Pricing, Clientes) com fórmula/fonte/limitações, e um resumo dos achados de QA (bugs corrigidos, cobertura de testes, itens de baixa severidade em aberto e a nota de páginas estáticas/sem revalidate). Revisão de coesão feita após a auditoria do QA. |

---

## Decisões já tomadas (Fase 1 — Fundação)

- Stack: Next.js 16 (App Router, TypeScript, Tailwind CSS v4), Recharts,
  `@supabase/supabase-js`. Sem `src/`, alias de import `@/*`.
- App é 100% somente leitura — sem autenticação de usuário, sem escrita no
  banco. RLS já garante isso no lado do banco; o client usa a chave
  publishable/anon.
- Light mode apenas (ver seção Design System acima).
- `dashboard/.env.local` já criado com as credenciais do Supabase (URL +
  anon key) e está no `.gitignore` (padrão do create-next-app já cobre
  `.env*`).
- Scaffold validado com `npm run build` e `npm run lint` antes de
  delegar (ver histórico de commits/execução).

---

## Testes (QA/Arquiteto — Fase 2)

Stack: **Vitest + React Testing Library + jsdom** (setup manual seguindo o
guia oficial em `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`,
consultado porque o Next 16 pode divergir do conhecimento prévio). Instalado
como devDependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`,
`@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`,
`vite-tsconfig-paths`.

- Config: `dashboard/vitest.config.mts` (environment `jsdom`, setup file
  `dashboard/vitest.setup.ts` que importa `@testing-library/jest-dom/vitest`).
- Scripts novos em `package.json`: `npm test` (watch) e `npm run test:run`
  (single run, use este em CI).
- Convenção: arquivos `*.test.ts(x)` colocados ao lado do arquivo testado
  (ex: `components/ui/KpiCard.test.tsx`), conforme já sugerido no board.
- **Atenção**: `npm run build` roda `tsc` sobre TODO o projeto, incluindo
  arquivos `*.test.ts(x)` (não há exclude no `tsconfig.json`). Um erro de
  tipo dentro de um teste quebra o build de produção, não só `npm test`.
  Rode `npm run test:run` E `npm run build` antes de dar uma seção como
  `done`.
- Limitação conhecida (documentada no guia oficial): Vitest não suporta
  Server Components `async`. Cobrir esses fluxos com E2E si necessário —
  fora de escopo desta fase.
- Testes escritos na 1ª passada (fundação): `lib/colors.test.ts` (sanidade
  da paleta — `ACCENT`/`CATEGORICAL`/`STATUS`) e
  `components/ui/KpiCard.test.tsx` (label/valor/delta/trend/accent/children).
- Testes escritos na passada dedicada (Vendas/Pricing/Clientes), sempre
  sobre as funções puras de agregação, sem tocar Supabase de verdade:
  `components/vendas/metrics.test.ts`, `components/pricing/data.test.ts`
  e `components/clientes/metrics.test.ts` — cobrem as fórmulas de cada
  KPI, o tratamento dos produtos/clientes placeholder/órfãos, e casos de
  borda (lista vazia, base 0 em divisões, dataset sem vendas).
- **Total: 44/44 testes passando** (`npm run test:run`).
- Achado de setup (ver item da tabela abaixo): `components/pricing/data.ts`
  importa `@/lib/supabase` no topo do arquivo mesmo contendo funções
  puras de agregação — como `lib/supabase.ts` lança em import-time se as
  env vars não existirem, e o Vitest não carrega `.env.local`
  automaticamente (isso é um comportamento do Next.js runtime, não do
  Vite/Vitest puro), qualquer teste que importasse esse arquivo quebrava
  antes de rodar. Contornado com fallback de env vars fake em
  `vitest.setup.ts` (nunca faz chamada de rede de verdade — só evita o
  crash de import). `components/vendas/data.ts` + `metrics.ts` e
  `components/clientes/data.ts` + `metrics.ts` já seguem o padrão
  correto (I/O separado de agregação pura); recomendação para Pricing
  na tabela de achados.

## Achados de QA

Legenda de severidade: **crítico** (bloqueia release/segurança) · **alto**
(build/funcionalidade quebrada) · **médio** (inconsistência a corrigir) ·
**baixo** (nit/observação).

| # | Arquivo | Problema | Severidade | Recomendação | Status |
|---|---|---|---|---|---|
| 1 | Supabase (RLS, todas as 4 tabelas) | Verificado via `mcp__supabase__list_tables` (RLS habilitado nas 4 tabelas) e `pg_policies` (SQL direto): cada tabela tem exatamente 1 policy, `SELECT` para `{anon,authenticated}`, `qual = true`, sem nenhuma policy de INSERT/UPDATE/DELETE. `get_advisors(security)` retornou 0 lints. | — (positivo) | Nenhuma ação — configuração correta para um dashboard somente-leitura. | ✅ verificado, sem achado |
| 2 | `lib/supabase.ts` | Usa apenas `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (chave `sb_publishable_...`, não uma JWT de service_role). Nenhuma referência a `service_role` encontrada em `app/**` ou `components/**` (`grep` dedicado). `.env.local` está coberto pelo `.gitignore` (`.env*`, padrão do create-next-app). | — (positivo) | Nenhuma ação. | ✅ verificado, sem achado |
| 3 | `app/layout.tsx`, `lib/colors.ts`, `components/ui/KpiCard.tsx`, `app/globals.css`, `app/page.tsx` | Conferidos linha a linha contra a seção "Design System" do TASKS.md: tokens de cor, tipografia, espaçamento e o contrato do `KpiCard` (label/value/delta/trend/accent/children) batem com o documentado. `npm run build` e `npm run lint` passam limpos sobre a fundação (antes dos stubs virarem código real). | — (positivo) | Nenhuma ação. | ✅ verificado, sem achado |
| 4 | `app/globals.css` (`.tabular-nums`) | O Tailwind v4 já inclui a utilitária `tabular-nums` nativamente (font-variant-numeric); a classe customizada em `globals.css` duplica o mesmo efeito. Inofensivo (mesmo resultado visual), só redundante. | baixo | Opcional: remover a classe customizada e confiar na utilitária nativa do Tailwind v4. Não é bloqueante. | aberto |
| 5 | `components/vendas/RevenueByChannelChart.tsx`, `RevenueByWeekdayChart.tsx`, `RevenueTrendChart.tsx`, `components/clientes/GeoDistributionChart.tsx` | Incompatibilidade de tipos no `<Tooltip formatter/labelFormatter>` do Recharts v3 (parâmetro tipado como `ValueType \| undefined`/`ReactNode`, não `number`/`string` — breaking change vs. v2) quebrava `npm run build`. | alto (bloqueava `npm run build`) | Remover a anotação de tipo explícita e converter dentro da função (`(value) => [formatBRL(Number(value)), "Receita"]`). | ✅ resolvido — Vendas e Clientes corrigiram nos próprios arquivos; Pricing já nasceu sem o problema (confirmado nos 3 componentes de gráfico). `npm run build` do projeto inteiro passa limpo. |
| 6 | `app/clientes/page.tsx` (fetch de `vendas`, versão inicial) | **Crítico confirmado ao vivo**: a 1ª versão buscava `vendas` direto no Server Component sem `.range()`. Testei contra a API real (`supabase.from("vendas").select("id_venda",{count:"exact"})` sem range): retornou **1000 de 3020 linhas** (`count` exato via Postgres = 3020, `data.length` = 1000) — o PostgREST trunca em 1000 por padrão. Todos os KPIs de Clientes (Clientes Ativos, Frequência, Ticket Médio, Recência, Retenção, geoDistribution) seriam calculados sobre ~1/3 da base real. | crítico (dados incorretos, não só build quebrado) | Mover o fetch para `components/clientes/data.ts` com paginação `.range()` em blocos de 1000 até esgotar as páginas — mesmo padrão de `components/vendas/data.ts` e `components/pricing/data.ts` (que já paginavam corretamente desde o início). | ✅ resolvido — dono de Clientes corrigiu antes de eu terminar a auditoria; confirmei o novo `components/clientes/data.ts` (`fetchAllVendas`/`fetchAllClientes` com `.range()`, mesmo padrão de Vendas/Pricing) e re-rodei `npm run build`/`lint`/testes: tudo limpo. |
| 7 | `components/pricing/data.ts` | O arquivo mistura I/O (import de `@/lib/supabase`, `fetchPricingDataset`) com as funções puras de agregação (`computePricingKpis`, `computeCategoriaPricing`, etc.) no mesmo módulo. Diferente de Vendas (`data.ts` só I/O + `metrics.ts` só puro) e Clientes (idem), o que fez qualquer teste unitário das funções puras falhar ao importar o módulo, porque `lib/supabase.ts` lança em import-time sem env vars (e o Vitest não carrega `.env.local`). Não é um bug funcional em produção (o Next.js real sempre tem as env vars), só uma pegadinha de testabilidade/consistência arquitetural. | médio | Extrair `computePricingKpis`/`computeCategoriaPricing`/`computeIntradayCompetitorSeries`/`computeProdutoRanking`/`isPlaceholderProduct`/`average` para um `components/pricing/metrics.ts` sem import de `lib/supabase`, mantendo `data.ts` só com `fetchPricingDataset`. | ✅ resolvido — dono de Pricing extraiu as funções puras para `components/pricing/metrics.ts` (`data.ts` agora só tem `fetchPricingDataset` + interfaces de linha bruta); teste renomeado para `metrics.test.ts`. Confirmado lendo o código na integração final (Fase 3): `data.ts` importa só `@/lib/supabase`, `page.tsx` importa as funções de `@/components/pricing/metrics`. `npm run test:run` (44/44) e `npm run build` revalidados. |
| 8 | `app/clientes/page.tsx:35` (bloco de erro) | Usa `text-[#d03b3b]` (hex solto via arbitrary value do Tailwind) em vez de importar `STATUS.critical` de `lib/colors.ts` — viola a regra "não redeclare hex codes soltos nos componentes" do Design System. Só aparece no caminho de erro (fetch do Supabase falhar), então baixo impacto visual, mas é o mesmo valor de `STATUS.critical` reescrito à mão. | baixo | Trocar por `style={{ color: STATUS.critical }}` importando `STATUS` de `@/lib/colors` (Tailwind não permite interpolar uma constante JS num nome de classe estático). | ✅ resolvido — confirmado em `app/clientes/page.tsx:2,35`: `import { ACCENT, STATUS } from "@/lib/colors"` e `style={{ color: STATUS.critical }}`, sem hex solto. |
| 9 | `components/pricing/CategoriaPositionChart.tsx:41` | `<ReferenceLine stroke="#c3c2b7" />` hardcoded — é exatamente o valor de `CHART_CHROME.baseline` em `lib/colors.ts`, só que reescrito à mão em vez de importado. | baixo | Importar `CHART_CHROME` de `@/lib/colors` e usar `CHART_CHROME.baseline`. | ✅ resolvido — confirmado em `components/pricing/CategoriaPositionChart.tsx:42`: `<ReferenceLine y={0} stroke={CHART_CHROME.baseline} />`, `CHART_CHROME` importado no topo do arquivo. |
| 10 | `components/pricing/ProdutoRankingTable.tsx` | Usa `STATUS.serious`/`STATUS.good` para colorir a célula de "Diferença" nas tabelas de ranking, mas sem ícone/seta — só a cor + o número (ex: `+12.3%` em laranja). O Design System pede "sempre com ícone/seta + label, nunca só a cor" para as cores de status. Mitigado parcialmente pelo título de cada tabela ("Mais acima"/"Mais abaixo do mercado"), mas a célula isolada não teria essa pista. | baixo | Adicionar um indicador visual (ex: `▲`/`▼` antes do percentual), ou aceitar como exceção documentada já que o agrupamento em duas tabelas rotuladas já comunica a direção. | decisão de design aceita, sem ação necessária — o líder (Fase 3 — Integração) validou o argumento: as duas tabelas já são tituladas "Mais acima"/"Mais abaixo do mercado", então a direção nunca depende só da cor da célula. Não bloqueia a conclusão do dashboard. |
| 11 | `components/vendas/data.ts`, `components/pricing/data.ts` (ambos), `components/clientes/data.ts` | Positivo: as 3 seções agora buscam `vendas` (3020 linhas) com paginação `.range()` correta em blocos de 1000, testado/confirmado. Nenhuma segue buscando com `.select()` sem paginação. | — (positivo) | Nenhuma ação. | ✅ verificado, sem achado |
| 12 | `app/clientes/page.tsx`, `app/pricing/page.tsx`, `app/vendas/page.tsx` | Observação arquitetural (não bloqueante): as 3 páginas são Server Components `async` que buscam dados no Supabase sem `export const dynamic`/`revalidate`, e `npm run build` mostra as 3 rotas como `○ (Static)` — ou seja, o Next.js as pré-renderiza uma vez NO BUILD e serve o mesmo HTML estático depois, sem refazer o fetch a cada request. Para este dataset (documentado como "recorte histórico fixo") isso é provavelmente aceitável ou até desejado, mas vale uma decisão explícita do time: se o banco for atualizado no futuro, o dashboard só vai refletir isso após um novo build/deploy, não em tempo real. | baixo/médio (decisão de produto, não bug) | Se dados ao vivo forem necessários no futuro: adicionar `export const revalidate = <segundos>` (ISR) ou `export const dynamic = "force-dynamic"` nas 3 páginas. | decisão de produto aceita, sem ação necessária — o dataset é um recorte histórico fixo (dez/2025–jan/2026), não dados ao vivo; páginas estáticas são o comportamento correto para esse caso, e a limitação já está documentada no README (seção "Achados de QA") para não ser redescoberta. Revisitar `revalidate`/`force-dynamic` só se o banco passar a receber dados novos continuamente. |

Observação: itens 1–3 cobrem a fundação (Fase 1, já `done` pelo Líder) e
não precisam de nova verificação a menos que esses arquivos mudem. Itens
5–6 eram de severidade alta/crítica e já foram corrigidos pelos donos
(confirmados por mim com build/lint/testes rodando limpos depois da
correção). Itens 7–9 eram de severidade média/baixa e foram corrigidos
pelo dono de Pricing — confirmados lendo o código na integração final
(Fase 3), não apenas pelo relato na tabela de tarefas. Itens 10 e 12 são
decisões de design/produto já aceitas pelo time (não bugs, não bloqueiam
a conclusão) — mantidas aqui apenas como registro histórico.

## Achados de QA — todos endereçados (Fase 3 — Integração)

Conferido pelo Líder na integração final: dos 12 achados acima, **nenhum
está em aberto sem uma resolução ou decisão explícita**. Item 4 (classe
`.tabular-nums` redundante com a utilitária nativa do Tailwind v4) segue
como o único item verdadeiramente opcional/cosmético sem decisão formal —
inofensivo, não bloqueia a conclusão do dashboard.

---

## Fase 3 — Integração (Líder)

Passada final de integração feita pelo Líder depois que as 3 seções e o
QA reportaram `done` e o Documentador entregou o `README.md`. Objetivo:
confirmar que o dashboard funciona como um todo coeso, não só seção por
seção, e fechar qualquer discrepância entre o que a tabela de tarefas
narrava e o que o código realmente tinha.

**1) Build/lint/test rodados juntos, projeto inteiro** (não seção a
seção): `npm run lint` limpo, `npm run test:run` → **44/44 testes
passando** (5 arquivos de teste), `npm run build` → compila e as 5 rotas
(`/`, `/vendas`, `/pricing`, `/clientes`, `/_not-found`) geram como
`○ (Static)` sem erro de TypeScript/ESLint/Recharts.

**2) Coesão de navegação e visual** — lido `app/layout.tsx`, `app/page.tsx`
e as 3 `app/<secao>/page.tsx` por completo: nav do header linka
corretamente para `/vendas`, `/pricing`, `/clientes`; a home linka para as
mesmas 3 rotas com título/descrição/accent batendo com o que cada seção
de fato construiu (nenhuma seção mudou de escopo a ponto de a home ficar
desatualizada — não precisou editar `page.tsx`/`layout.tsx`). Conferido
via `grep` que os 8 componentes de gráfico das 3 seções (Vendas: 3,
Pricing: 3, Clientes: 2) importam `CHART_TOOLTIP_STYLE`/`CHART_GRID_PROPS`/
`CHART_AXIS_PROPS` de `lib/colors.ts` (nenhum ficou de fora), nenhum usa
`yAxisId` (sem eixo duplo em lugar nenhum) e não sobrou nenhuma cor hex
solta fora de `lib/colors.ts` nos componentes/páginas das 3 seções.
Arquivos de fundação (`layout.tsx`, `page.tsx` home, `globals.css`,
`lib/supabase.ts`, `lib/colors.ts`, `components/ui/KpiCard.tsx`)
conferidos byte a byte contra o que a Fase 1 deixou — **ninguém editou
fora da própria pasta**, convenção de arquivos respeitada à risca pelos 3
especialistas.

**3) Achados de QA — auditoria de veracidade**: a tabela "Achados de QA"
tinha uma inconsistência real — itens 7 (separação `data.ts`/`metrics.ts`
em Pricing), 8 (`STATUS.critical` em vez de hex solto em
`app/clientes/page.tsx`) e 9 (`CHART_CHROME.baseline` em vez de hex solto
em `CategoriaPositionChart.tsx`) estavam marcados **"aberto"** na tabela,
mas a narrativa da linha "Pricing" na tabela de tarefas e o código-fonte
já mostravam os três corrigidos. Confirmei lendo o código
diretamente (não confiando só no relato) e corrigi o status desses 3
itens para "✅ resolvido" com a evidência exata (arquivo:linha). Itens 10
(ícone de status ausente em `ProdutoRankingTable`) e 12 (páginas
estáticas sem `revalidate`) foram reclassificados de "aberto — decisão do
time" para "decisão aceita, sem ação necessária", já que são
trade-offs deliberados, não bugs pendentes — mantê-los como "aberto"
indefinidamente criaria a impressão de trabalho inacabado. Item 4
(`.tabular-nums` redundante) é o único que segue genuinamente sem decisão
tomada — cosmético, não bloqueante, deixado como está.

**4) Documentação (`README.md`)**: lido por completo. Cobre setup,
arquitetura/RLS, modelo de dados (incluindo os 20 produtos placeholder e
a ausência de coluna de valor total em `vendas`), resumo do design system
com link para a spec completa aqui, os KPIs finais das 3 seções com
fórmula/fonte/resultado no dataset, e um resumo dos achados de QA. Está
coerente com o que foi de fato construído (fórmulas/resultados batem com
os documentados nesta tabela de tarefas) e com a integração corrigida no
item 3 acima. Nenhum ajuste foi necessário no `README.md` além dos já
feitos pelo Documentador.

**5) Nenhuma inconsistência de integração encontrada** que exigisse
mudança em `layout.tsx`/`page.tsx` — a única correção necessária nesta
fase foi de **documentação** (a tabela de achados de QA desatualizada em
relação ao código), já aplicada acima.

**Conclusão**: o dashboard está íntegro como um todo — as 3 seções
funcionam sob a mesma navegação, mesmo design system, mesmos dados
somente-leitura, com build/lint/testes limpos rodando juntos. **Pronto
para ser considerado concluído** (Fase 1 + Fase 2 + Fase 3 completas).
Único trabalho pendente é opcional/cosmético (item 4 da tabela de
achados) e não bloqueia o uso ou deploy do dashboard.
