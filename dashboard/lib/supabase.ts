import { createClient } from "@supabase/supabase-js";

/**
 * Cliente único do Supabase para uso em toda a aplicação (client components).
 *
 * Este app é somente leitura (RLS habilitado com policy pública de SELECT
 * para as roles anon/authenticated, sem escrita) e não possui autenticação
 * de usuário — por isso não há padrões de sessão/login aqui, apenas um
 * client simples usando a anon/publishable key.
 *
 * NÃO importe nem exponha nenhuma chave de service_role neste arquivo ou
 * em qualquer código que rode no browser.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variáveis de ambiente do Supabase ausentes. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em dashboard/.env.local."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
