import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

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
  global: { fetch: createSupabaseFetch(key) },
});

async function main() {
  console.log("=== INVESTIGAÇÃO DE COLUNAS E CONTAGEM (COM AUTH) ===");

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@jansol.com.br",
    password: "admin",
  });

  if (authErr) {
    console.log("Auth login attempt:", authErr.message);
  } else {
    console.log("Autenticado como:", authRes.user?.email, "id:", authRes.user?.id);
  }

  const { data: sample } = await supabase.from("clientes").select("*").limit(1);
  if (sample && sample[0]) {
    console.log("Colunas da tabela public.clientes:", Object.keys(sample[0]));
  }

  const { data: todosClientes, error } = await supabase
    .from("clientes")
    .select("*");

  if (error) {
    console.error("Erro ao ler clientes:", error.message);
    return;
  }

  const total = todosClientes?.length || 0;
  console.log(`Total de registros na tabela public.clientes: ${total}`);

  const arquivadosTrue = todosClientes?.filter((c) => (c as any).arquivado === true) || [];
  console.log(`Clientes com arquivado = true: ${arquivadosTrue.length}`);

  const arquivadosFalse = todosClientes?.filter((c) => (c as any).arquivado === false) || [];
  console.log(`Clientes com arquivado = false: ${arquivadosFalse.length}`);

  const arquivadosNulo = todosClientes?.filter((c) => (c as any).arquivado === null || (c as any).arquivado === undefined) || [];
  console.log(`Clientes com arquivado NULL/undefined: ${arquivadosNulo.length}`);

  if (arquivadosTrue.length > 0) {
    console.log("\n--- CLIENTES ARQUIVADOS ENCONTRADOS ---");
    arquivadosTrue.forEach((c) => {
      console.log(`ID: ${c.id} | Nome: ${c.nome} | Arquivado em: ${(c as any).arquivado_em} | Por: ${(c as any).arquivado_por} | Motivo: ${(c as any).motivo_arquivamento}`);
    });
  }

  // Verificar manutenções no banco
  const { data: manutencoes } = await supabase.from("manutencoes").select("*");
  console.log(`\nTotal de manutenções no banco: ${manutencoes?.length || 0}`);
  (manutencoes || []).forEach((m) => {
    console.log(`ID: ${m.id} | Cliente ID: ${m.cliente_id} | Tipo: ${m.tipo} | Data: ${m.data_manutencao} | Descrição: ${m.descricao}`);
  });
}

main();
