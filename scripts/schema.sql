-- Schema do projeto eCommerceDataAnalysisMCP
-- Rode este script inteiro no SQL Editor do Supabase (ou via `supabase db query` /
-- MCP `execute_sql`/`apply_migration`) em um projeto novo, antes de rodar
-- scripts/load_data.py.
--
-- Corresponde as migrations aplicadas no projeto original:
--   20260829134149_create_ecommerce_tables
--   20260829170646_add_public_read_policies_dashboard

create table public.clientes (
  id_cliente text primary key,
  nome_cliente text not null,
  estado text not null,
  pais text not null,
  data_cadastro timestamptz not null
);

create table public.produtos (
  id_produto text primary key,
  nome_produto text not null,
  categoria text not null,
  marca text not null,
  preco_atual numeric(10,2) not null,
  data_criacao timestamptz not null
);

create table public.vendas (
  id_venda text primary key,
  data_venda timestamptz not null,
  id_cliente text not null references public.clientes(id_cliente),
  id_produto text not null references public.produtos(id_produto),
  canal_venda text not null,
  quantidade integer not null,
  preco_unitario numeric(10,2) not null
);

create table public.preco_competidores (
  id bigint generated always as identity primary key,
  id_produto text not null references public.produtos(id_produto),
  nome_concorrente text not null,
  preco_concorrente numeric(10,2) not null,
  data_coleta timestamptz not null
);

create index idx_vendas_id_cliente on public.vendas (id_cliente);
create index idx_vendas_id_produto on public.vendas (id_produto);
create index idx_preco_competidores_id_produto on public.preco_competidores (id_produto);

-- RLS: habilitado em todas as tabelas, com policy de SOMENTE LEITURA para as
-- roles anon/authenticated. Não há nenhuma policy de INSERT/UPDATE/DELETE -
-- por isso scripts/load_data.py precisa da service_role key (que ignora RLS),
-- nunca da chave publishable/anon.
alter table public.clientes enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.preco_competidores enable row level security;

create policy "public read access" on public.clientes for select to anon, authenticated using (true);
create policy "public read access" on public.produtos for select to anon, authenticated using (true);
create policy "public read access" on public.vendas for select to anon, authenticated using (true);
create policy "public read access" on public.preco_competidores for select to anon, authenticated using (true);
