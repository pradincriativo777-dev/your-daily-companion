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
  const { data: sample, error: sampleErr } = await supabase
    .from("manutencoes")
    .select("*")
    .limit(1);

  if (sampleErr) {
    console.error("Erro ao ler colunas de manutencoes:", sampleErr.message);
    return;
  }

  if (sample && sample[0]) {
    console.log("Colunas da tabela manutencoes:", Object.keys(sample[0]));
  }

  const { data: manutencoes } = await supabase.from("manutencoes").select("*");

  const counts: Record<string, any[]> = {};
  (manutencoes || []).forEach((m) => {
    // Verificar identificador de duplicação (ex: descricao, cliente_id + data_manutencao)
    const key = `${m.cliente_id}_${m.data_manutencao}_${m.tipo}`;
    if (!counts[key]) counts[key] = [];
    counts[key].push(m);
  });

  const duplicados = Object.entries(counts).filter(([_, items]) => items.length > 1);

  console.log(`\n=== RELATÓRIO DE DUPLICAÇÃO DE MANUTENÇÕES ===`);
  console.log(`Total de registros em manutencoes: ${manutencoes?.length || 0}`);
  console.log(`Chaves únicas (cliente+data+tipo): ${Object.keys(counts).length}`);
  console.log(`Registros com combinações idênticas (duplicados): ${duplicados.length}`);

  duplicados.forEach(([key, items]) => {
    console.log(`\nCombinação: ${key} (${items.length} registros repetidos)`);
    items.forEach((item) => {
      console.log(`  - ID DB: ${item.id} | Descrição: ${item.descricao} | Criado em: ${item.created_at}`);
    });
  });
}

main();
