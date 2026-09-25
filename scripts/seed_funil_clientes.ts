import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { CLIENTES_TESTE_FUNIL } from "../src/lib/funil-test-data";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !key) {
  console.error("ERRO: VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY devem estar configurados no .env");
  process.exit(1);
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(url, key, {
  global: { fetch: createSupabaseFetch(key) },
});

async function run() {
  console.log("=== INICIANDO GERAÇÃO DE CLIENTES DE TESTE DO FUNIL ===");
  
  // 1. Tentar login como admin caso o RLS exija
  const adminEmail = process.env.ADMIN_EMAIL || "admin@jansol.com.br";
  const adminPass = process.env.ADMIN_PASSWORD || "admin";
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPass,
  });

  if (authErr) {
    console.log("Info Auth (continuando com chave pública/service):", authErr.message);
  } else {
    console.log("Autenticado como:", authData.user?.email);
  }

  // 2. Buscar ou criar técnicos de referência
  let { data: tecnicos } = await supabase.from("tecnicos").select("id, nome");
  if (!tecnicos || tecnicos.length === 0) {
    console.log("Nenhum técnico encontrado. Criando técnicos de demonstração...");
    const { data: novosTecnicos, error: tecErr } = await supabase.from("tecnicos").insert([
      { nome: "Carlos Silva (Instalação)", especialidade: "Instalação", status: "Ativo", telefone: "(24) 99888-1111" },
      { nome: "Marcos Oliveira (Manutenção)", especialidade: "Manutenção", status: "Ativo", telefone: "(24) 99777-2222" },
      { nome: "Rafael Souza (Ambos)", especialidade: "Ambos", status: "Ativo", telefone: "(24) 99666-3333" },
    ]).select();
    if (tecErr) console.warn("Aviso ao criar técnicos:", tecErr.message);
    else tecnicos = novosTecnicos || [];
  }

  const tecIds = (tecnicos || []).map((t: any) => t.id);

  // 3. Preparar clientes com técnico associado
  const clientesParaInserir = CLIENTES_TESTE_FUNIL.map((c, idx) => ({
    ...c,
    tecnico_id: tecIds.length > 0 ? tecIds[idx % tecIds.length] : null,
  }));

  console.log(`Inserindo ${clientesParaInserir.length} clientes divididos nas etapas do funil...`);

  // 4. Inserir clientes
  const { data: inserted, error: insertErr } = await supabase
    .from("clientes")
    .insert(clientesParaInserir)
    .select("id, nome, status, valor_orcamento");

  if (insertErr) {
    console.error("ERRO ao inserir clientes de teste:", insertErr.message);
    process.exit(1);
  }

  console.log(`\n✅ Sucesso! ${inserted?.length || 0} clientes de teste cadastrados.`);
  
  // Resumo por status
  const resumo: Record<string, number> = {};
  inserted?.forEach((c: any) => {
    resumo[c.status] = (resumo[c.status] || 0) + 1;
  });

  console.log("\n📊 Distribuição no Funil de Vendas (Kanban):");
  Object.entries(resumo).forEach(([st, qtd]) => {
    console.log(` - ${st}: ${qtd} clientes`);
  });
  console.log("\nAbra a página do Kanban (/dashboard/kanban) para testar o arraste de cards, filtros e relatórios!");
}

run();
