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
  // Autenticação para RLS
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@jansol.com.br",
    password: "admin",
  });

  if (authErr) {
    console.log("Aviso auth:", authErr.message);
  } else {
    console.log("Autenticado como:", authData.user?.email);
  }

  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("id, nome, created_at, status, cidade, observacoes")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar clientes:", error);
    return;
  }

  console.log(`Total de clientes no banco: ${clientes.length}`);

  // Analisar por data de criação
  const agrupadoPorData: Record<string, typeof clientes> = {};
  for (const c of clientes) {
    const dataStr = new Date(c.created_at).toISOString().split("T")[0];
    if (!agrupadoPorData[dataStr]) agrupadoPorData[dataStr] = [];
    agrupadoPorData[dataStr].push(c);
  }

  console.log("\n--- Distribuição por data de criação ---");
  for (const [data, list] of Object.entries(agrupadoPorData)) {
    console.log(`${data}: ${list.length} clientes`);
  }

  // Identificar os clientes além dos 817 iniciais
  if (clientes.length > 817) {
    console.log("\n--- Clientes além dos 817 iniciais ---");
    const ultimos = clientes.slice(817);
    ultimos.forEach((c, idx) => {
      console.log(`\n[Cliente Extra #${idx + 1}]`);
      console.log(`ID: ${c.id}`);
      console.log(`Nome: ${c.nome}`);
      console.log(`Status: ${c.status}`);
      console.log(`Cidade: ${c.cidade}`);
      console.log(`Criado em: ${c.created_at}`);
      console.log(`Observações: ${c.observacoes}`);
    });
  }
}

main();
