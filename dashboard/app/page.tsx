import Link from "next/link";
import { ACCENT } from "@/lib/colors";

const SECTIONS = [
  {
    href: "/vendas",
    title: "Vendas & Receita",
    description:
      "Evolução de receita, volume de pedidos, ticket médio e desempenho por canal de venda, categoria e produto.",
    accent: ACCENT.vendas,
  },
  {
    href: "/pricing",
    title: "Pricing & Margem",
    description:
      "Comparação do preço praticado contra o preço de tabela e a concorrência, descontos aplicados e oportunidades de precificação.",
    accent: ACCENT.pricing,
  },
  {
    href: "/clientes",
    title: "Clientes & Comportamento",
    description:
      "Base de clientes, frequência de compra, retenção, ticket médio por cliente e distribuição geográfica.",
    accent: ACCENT.clientes,
  },
];

/**
 * Home — dono: líder/QA. Não editar sem coordenar via mensagem para "main".
 */
export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Dashboard de E-commerce
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Visão executiva de vendas, precificação e comportamento de clientes.
          Escolha uma seção abaixo para explorar os indicadores em detalhe.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderTopColor: section.accent, borderTopWidth: 3 }}
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 flex-1 text-sm text-text-secondary">
              {section.description}
            </p>
            <span
              className="mt-4 text-sm font-medium"
              style={{ color: section.accent }}
            >
              Abrir seção →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
