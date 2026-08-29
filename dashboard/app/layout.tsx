import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-commerce Dashboard",
  description:
    "Dashboard executivo de vendas, pricing e clientes para o e-commerce.",
};

const NAV_LINKS = [
  { href: "/vendas", label: "Vendas & Receita" },
  { href: "/pricing", label: "Pricing & Margem" },
  { href: "/clientes", label: "Clientes & Comportamento" },
];

/**
 * Layout raiz — dono: líder/QA. Não editar sem coordenar via mensagem
 * para "main" (evita conflitos entre os especialistas de cada seção).
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b border-border-subtle bg-surface-card/95 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4 md:px-8">
            <Link href="/" className="text-base font-bold tracking-tight">
              E-commerce Dashboard
            </Link>
            <div className="flex flex-1 items-center gap-1 text-sm font-medium">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-text-secondary transition-colors hover:bg-background hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
