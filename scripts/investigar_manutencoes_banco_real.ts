import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: createSupabaseFetch(key) },
});

async function main() {
  console.log("=== INSPEÇÃO DIRETA TABELA PUBLIC.MANUTENCOES ===");

  const { data: manutencoes, error } = await supabase
    .from("manutencoes")
    .select("*");

  if (error) {
    console.error("Erro ao ler manutencoes:", error.message);
    return;
  }

  console.log(`Total de manutenções na tabela public.manutencoes: ${manutencoes?.length || 0}`);
  (manutencoes || []).forEach((m, idx) => {
    console.log(`\n[${idx + 1}] ID: ${m.id}`);
    console.log(`    Cliente ID: ${m.cliente_id}`);
    console.log(`    Tipo: ${m.tipo} | Status: ${m.status}`);
    console.log(`    Data: ${m.data_manutencao} | Próxima: ${m.proxima_manutencao}`);
    console.log(`    Descrição: ${m.descricao}`);
    console.log(`    AUVO Task ID: ${(m as any).auvo_task_id || "N/A"}`);
    console.log(`    Criado em: ${m.created_at}`);
  });
}

main();
