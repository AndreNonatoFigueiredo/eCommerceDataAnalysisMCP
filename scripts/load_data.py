"""Carrega os CSVs de data/ nas 4 tabelas do Supabase (schema criado por scripts/schema.sql).

Uso:
    pip install -r scripts/requirements.txt
    export SUPABASE_URL=https://SEU_PROJETO.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=eyJ...   # NUNCA a chave publishable/anon
    python scripts/load_data.py

Por que precisa da service_role key: as 4 tabelas têm RLS habilitado com
apenas policy de SELECT para anon/authenticated (ver scripts/schema.sql).
Um INSERT com a chave anon seria bloqueado pelo RLS. A service_role key
ignora RLS e deve ser usada só aqui, localmente, uma única vez para a carga
inicial - nunca no código do dashboard (dashboard/lib/supabase.ts usa
somente a chave publishable/anon, de leitura).

O que este script faz, na ordem:
  1. Lê data/clientes.csv e insere em public.clientes.
  2. Lê data/produtos.csv e insere em public.produtos.
  3. Lê data/vendas.csv, detecta id_produto referenciados que NÃO existem
     em produtos.csv (dados órfãos presentes neste dataset de exemplo) e
     insere um produto placeholder para cada um antes de inserir as vendas,
     preservando a integridade referencial sem descartar vendas reais.
  4. Insere data/vendas.csv em public.vendas.
  5. Insere data/preco_competidores.csv em public.preco_competidores.

Todas as tabelas são truncadas (DELETE) antes da carga, para o script ser
re-executável em um projeto vazio ou para recarregar do zero.
"""

from __future__ import annotations

import csv
import os
import sys
from pathlib import Path

from supabase import Client, create_client

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
BATCH_SIZE = 500


def read_csv(name: str) -> list[dict]:
    with open(DATA_DIR / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def insert_in_batches(client: Client, table: str, rows: list[dict]) -> None:
    if not rows:
        return
    for i in range(0, len(rows), BATCH_SIZE):
        chunk = rows[i : i + BATCH_SIZE]
        client.table(table).insert(chunk).execute()
        print(f"  {table}: {min(i + BATCH_SIZE, len(rows))}/{len(rows)}")


def build_placeholder_products(vendas: list[dict], known_product_ids: set[str]) -> list[dict]:
    """Cria um produto placeholder para cada id_produto de vendas.csv que não
    existe em produtos.csv, usando dados da primeira venda que o referencia."""
    seen: dict[str, dict] = {}
    for row in vendas:
        pid = row["id_produto"]
        if pid in known_product_ids or pid in seen:
            continue
        seen[pid] = {
            "id_produto": pid,
            "nome_produto": "Produto Descontinuado",
            "categoria": "Desconhecida",
            "marca": "Desconhecida",
            "preco_atual": row["preco_unitario"],
            "data_criacao": row["data_venda"],
        }
    return list(seen.values())


def main() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY como variáveis de "
            "ambiente antes de rodar este script (ver docstring no topo do arquivo)."
        )

    client = create_client(url, key)

    clientes = read_csv("clientes.csv")
    produtos = read_csv("produtos.csv")
    vendas = read_csv("vendas.csv")
    preco_competidores = read_csv("preco_competidores.csv")

    print(f"Lidos: clientes={len(clientes)} produtos={len(produtos)} "
          f"vendas={len(vendas)} preco_competidores={len(preco_competidores)}")

    known_product_ids = {p["id_produto"] for p in produtos}
    placeholders = build_placeholder_products(vendas, known_product_ids)
    if placeholders:
        print(f"Encontrados {len(placeholders)} id_produto em vendas.csv sem "
              f"correspondência em produtos.csv - criando placeholders para "
              f"preservar a integridade referencial.")

    # Limpa as tabelas na ordem inversa das dependências de FK, para o
    # script poder ser re-executado sobre um banco já carregado.
    print("Limpando tabelas existentes...")
    client.table("preco_competidores").delete().neq("id", -1).execute()
    client.table("vendas").delete().neq("id_venda", "").execute()
    client.table("produtos").delete().neq("id_produto", "").execute()
    client.table("clientes").delete().neq("id_cliente", "").execute()

    print("Inserindo clientes...")
    insert_in_batches(client, "clientes", clientes)

    print("Inserindo produtos (reais + placeholders)...")
    insert_in_batches(client, "produtos", produtos + placeholders)

    print("Inserindo vendas...")
    insert_in_batches(client, "vendas", vendas)

    print("Inserindo preco_competidores...")
    insert_in_batches(client, "preco_competidores", preco_competidores)

    print("Carga concluída.")


if __name__ == "__main__":
    main()
