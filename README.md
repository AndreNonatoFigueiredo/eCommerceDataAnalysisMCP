# eCommerceDataAnalysisMCP

Projeto de análise de dados de e-commerce: 4 tabelas de dados sintéticos
(clientes, produtos, vendas, preços de concorrentes) carregadas num banco
Postgres do [Supabase](https://supabase.com), mais um dashboard analítico
em Next.js consumindo esses dados. O banco foi administrado via
[MCP (Model Context Protocol)](https://supabase.com/docs/guides/getting-started/mcp)
do Supabase, usado pelo Claude Code para criar o schema e carregar os
dados.

Este README documenta o projeto do zero até o dashboard rodando, para que
qualquer pessoa consiga reproduzir os passos num projeto Supabase próprio.

## Sumário

- [Visão geral e arquitetura](#visão-geral-e-arquitetura)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Passo a passo: banco de dados (Supabase)](#passo-a-passo-banco-de-dados-supabase)
  - [1. Criar o projeto Supabase](#1-criar-o-projeto-supabase)
  - [2. Criar o schema (tabelas, índices, RLS)](#2-criar-o-schema-tabelas-índices-rls)
  - [3. Carregar os dados dos CSVs](#3-carregar-os-dados-dos-csvs)
  - [4. Conferir a carga](#4-conferir-a-carga)
- [Modelo de dados](#modelo-de-dados)
- [Qualidade de dados: os 20 produtos placeholder](#qualidade-de-dados-os-20-produtos-placeholder)
- [Segurança: RLS e chaves do Supabase](#segurança-rls-e-chaves-do-supabase)
- [Passo a passo: dashboard (Next.js)](#passo-a-passo-dashboard-nextjs)
- [MCP do Supabase (opcional, para uso com Claude Code)](#mcp-do-supabase-opcional-para-uso-com-claude-code)
- [Como este projeto foi construído](#como-este-projeto-foi-construído)

## Visão geral e arquitetura

```
data/*.csv  --(scripts/load_data.py)-->  Supabase Postgres  --(supabase-js, chave anon)-->  dashboard/ (Next.js)
                                          4 tabelas, RLS
                                          somente leitura p/ anon
```

- **Dados de origem**: 4 arquivos CSV em [`data/`](data/), gerados
  sinteticamente (clientes, produtos, vendas e preços de concorrentes
  fictícios de um e-commerce).
- **Banco de dados**: projeto Supabase (Postgres gerenciado) com 4 tabelas
  relacionadas por chave estrangeira, RLS habilitado, e uma policy de
  leitura pública (só `SELECT`) para permitir que o dashboard leia os
  dados com uma chave segura de client-side.
- **Dashboard**: aplicação Next.js em [`dashboard/`](dashboard/) com 3
  seções de negócio (Vendas & Receita, Pricing & Margem, Clientes &
  Comportamento), cada uma com KPIs e gráficos próprios. Documentação
  completa da aplicação (setup, arquitetura, KPIs, design system, achados
  de QA) em [`dashboard/README.md`](dashboard/README.md).

## Estrutura do repositório

```
.
├── data/                    # CSVs de origem (ver seção de carga)
│   ├── clientes.csv
│   ├── produtos.csv
│   ├── vendas.csv
│   └── preco_competidores.csv
├── scripts/
│   ├── schema.sql           # DDL: tabelas, índices, RLS, policies
│   ├── load_data.py         # carrega os CSVs no Supabase
│   └── requirements.txt
├── dashboard/                # app Next.js (ver dashboard/README.md)
├── .mcp.json                 # config do servidor MCP do Supabase (Claude Code)
└── README.md                 # este arquivo
```

## Pré-requisitos

- Uma conta e um projeto no [Supabase](https://supabase.com) (plano free
  serve).
- Python 3.9+ (para rodar a carga dos dados).
- Node.js 20+ e npm (para rodar o dashboard — ver
  [dashboard/README.md](dashboard/README.md) para a versão exata).

## Passo a passo: banco de dados (Supabase)

### 1. Criar o projeto Supabase

Crie um projeto novo no [dashboard do Supabase](https://supabase.com/dashboard).
Guarde três informações do projeto (em **Project Settings → API** e
**Project Settings → Database**):

- **Project URL** (ex.: `https://xxxxxxxx.supabase.co`)
- **anon / publishable key** — usada pelo dashboard Next.js (client-side,
  segura para expor)
- **service_role key** — usada **só** pelo script de carga, nunca em
  código de aplicação (ela ignora RLS)

### 2. Criar o schema (tabelas, índices, RLS)

Abra o **SQL Editor** do seu projeto Supabase e rode o conteúdo de
[`scripts/schema.sql`](scripts/schema.sql) inteiro. Isso cria:

- As 4 tabelas (`clientes`, `produtos`, `vendas`, `preco_competidores`)
  com as chaves primárias/estrangeiras corretas.
- 3 índices nas colunas de FK mais consultadas
  (`vendas.id_cliente`, `vendas.id_produto`, `preco_competidores.id_produto`).
- RLS habilitado nas 4 tabelas, com uma policy de **somente leitura**
  (`SELECT`) para as roles `anon`/`authenticated`. Não existe nenhuma
  policy de escrita — por isso a carga de dados precisa da service_role
  key (passo seguinte), que ignora RLS.

Alternativa via MCP/CLI, se preferir não usar o SQL Editor:

```bash
# via MCP do Supabase (ex.: dentro do Claude Code, com o MCP configurado — ver seção de MCP abaixo)
# rode o conteúdo de scripts/schema.sql com a tool `execute_sql`/`apply_migration`

# ou via Supabase CLI, se já tiver um projeto linkado
supabase db query < scripts/schema.sql
```

### 3. Carregar os dados dos CSVs

```bash
cd scripts
pip install -r requirements.txt

export SUPABASE_URL="https://SEU_PROJETO.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # a service_role key, NUNCA a anon key

python load_data.py
```

O script ([`scripts/load_data.py`](scripts/load_data.py)):

1. Lê os 4 CSVs de `data/`.
2. Detecta os `id_produto` referenciados em `vendas.csv` que não existem
   em `produtos.csv` (este dataset de exemplo tem 20 vendas assim — ver
   [seção de qualidade de dados](#qualidade-de-dados-os-20-produtos-placeholder))
   e cria um produto placeholder para cada um, para não violar a
   foreign key nem descartar vendas reais.
3. Limpa as tabelas (na ordem correta de FK) e insere `clientes`,
   depois `produtos` (reais + placeholders), depois `vendas`, depois
   `preco_competidores`, em lotes de 500 linhas.

É seguro rodar mais de uma vez — cada execução limpa e recarrega as 4
tabelas do zero.

### 4. Conferir a carga

No SQL Editor do Supabase (ou via MCP `execute_sql`):

```sql
select 'clientes' as tabela, count(*) from public.clientes
union all select 'produtos', count(*) from public.produtos
union all select 'vendas', count(*) from public.vendas
union all select 'preco_competidores', count(*) from public.preco_competidores;
```

Contagens esperadas com os CSVs deste repositório: `clientes`=50,
`produtos`=235 (215 reais + 20 placeholders), `vendas`=3020,
`preco_competidores`=728.

## Modelo de dados

Schema `public`:

| Tabela | Linhas | Papel | Colunas | Chaves |
|---|---|---|---|---|
| `clientes` | 50 | dimensão | `id_cliente`, `nome_cliente`, `estado`, `pais`, `data_cadastro` | PK `id_cliente` |
| `produtos` | 235 | dimensão | `id_produto`, `nome_produto`, `categoria`, `marca`, `preco_atual`, `data_criacao` | PK `id_produto` |
| `vendas` | 3020 | fato | `id_venda`, `data_venda`, `id_cliente`, `id_produto`, `canal_venda`, `quantidade`, `preco_unitario` | PK `id_venda`; FK → `clientes`, `produtos` |
| `preco_competidores` | 728 | fato (série temporal) | `id`, `id_produto`, `nome_concorrente`, `preco_concorrente`, `data_coleta` | PK `id`; FK → `produtos` |

Observações que valem para qualquer análise sobre esses dados:

- Não há coluna de valor total em `vendas` — o valor de uma linha é
  sempre `quantidade * preco_unitario`.
- `vendas.preco_unitario` (preço efetivamente praticado na venda) pode
  divergir de `produtos.preco_atual` (preço de tabela/corrente).
- **`vendas` tem 3020 linhas, acima do limite padrão de 1000 linhas por
  requisição do PostgREST/Supabase.** Qualquer consulta via
  `supabase-js`/API REST sem paginação (`.range()`) retorna
  silenciosamente só as primeiras 1000 linhas, sem erro — isso já causou
  um bug real no dashboard (ver [dashboard/README.md → Achados de QA](dashboard/README.md#achados-de-qa)). Consultas via SQL direto (SQL
  Editor, `execute_sql` do MCP, `psql`) não têm esse limite.

## Qualidade de dados: os 20 produtos placeholder

`vendas.csv` referencia 20 valores de `id_produto` que não existem em
`produtos.csv` — um dado "sujo" proposital neste dataset de exemplo, para
simular um cenário comum (produto removido do catálogo depois de já ter
sido vendido). Para preservar a integridade referencial sem descartar
vendas reais, `scripts/load_data.py` cria um produto placeholder para
cada um desses IDs, com:

- `nome_produto = "Produto Descontinuado"`
- `categoria = "Desconhecida"`, `marca = "Desconhecida"`
- `preco_atual` = o `preco_unitario` da venda que o referencia
- `data_criacao` = a `data_venda` dessa mesma venda

O dashboard trata esses 20 registros de forma explícita e documentada em
cada seção (ex.: mantidos na receita total agregada, mas excluídos de
rankings por categoria/marca) — ver
[dashboard/README.md → Modelo de dados](dashboard/README.md#modelo-de-dados).

## Segurança: RLS e chaves do Supabase

| Chave | Onde é usada | Permissão |
|---|---|---|
| `service_role` | só localmente, ao rodar `scripts/load_data.py` | ignora RLS — insere/apaga dados. **Nunca** vá para o código do dashboard nem para um repositório público. |
| `anon` / publishable | `dashboard/.env.local`, client Supabase do Next.js | só `SELECT`, por causa da policy de RLS — não consegue escrever mesmo se alguém tentar |

RLS está habilitado nas 4 tabelas com exatamente uma policy cada
(`SELECT` para `anon`/`authenticated`, `using (true)`) — ver
`scripts/schema.sql`. Essa decisão foi tomada porque este é um dashboard
analítico interno, sem modelo de usuário final/autenticação — os dados
não são sensíveis por linha (não há coluna de dono/tenant), então uma
policy de leitura pública é apropriada aqui. Não crie policies de
`INSERT`/`UPDATE`/`DELETE` para `anon`/`authenticated` — a única escrita
prevista no projeto é a carga inicial via `service_role`.

## Passo a passo: dashboard (Next.js)

Depois do banco criado e carregado:

```bash
cd dashboard
npm install
```

Crie `dashboard/.env.local` (não versionado) com a URL e a anon key do
seu projeto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-ou-publishable-key>
```

```bash
npm run dev      # http://localhost:3000
npm run build    # build de produção
npm run test:run # 44 testes (Vitest + React Testing Library)
```

Detalhes completos da aplicação — arquitetura, design system, KPIs de
cada seção com fórmula e fonte, achados de QA e decisões de produto —
estão em **[dashboard/README.md](dashboard/README.md)** e no board de
tarefas da equipe [dashboard/TASKS.md](dashboard/TASKS.md).

## MCP do Supabase (opcional, para uso com Claude Code)

Este repositório inclui [`.mcp.json`](.mcp.json) apontando para o servidor
MCP hospedado do Supabase, usado para administrar o projeto original
(criar tabelas, aplicar migrations, consultar dados) diretamente pelo
Claude Code, sem precisar de credenciais de banco locais. Para usar em um
projeto próprio, apague o `project_ref` do arquivo e refaça a
autenticação OAuth do MCP apontando para o seu projeto — isso não afeta o
dashboard Next.js, que fala com o Supabase via `supabase-js` normalmente.

## Como este projeto foi construído

1. **Carga de dados**: schema criado e os 4 CSVs carregados no Supabase
   via MCP (ver `scripts/schema.sql`/`scripts/load_data.py`, que
   reproduzem esse processo de forma independente do MCP).
2. **Dashboard**: construído por uma equipe de 6 agentes do Claude Code
   trabalhando em paralelo — um líder (fundação/design system +
   integração final), três especialistas de domínio (Vendas, Pricing,
   Clientes), um QA/arquiteto (testes + auditoria de segurança/
   arquitetura) e um documentador (README/TASKS.md incrementais).
   Detalhes completos do processo, decisões e achados em
   [dashboard/TASKS.md](dashboard/TASKS.md).
