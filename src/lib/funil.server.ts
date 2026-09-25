import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CLIENTES_TESTE_FUNIL } from "./funil-test-data";

export const serverSeedFunnelClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    try {
      // 1. Buscar ou criar técnicos de referência
      let { data: tecnicos, error: tecReadErr } = await (supabase as any)
        .from("tecnicos")
        .select("id, nome");

      if (tecReadErr) {
        console.warn("[Seed Funil] Erro ao ler técnicos:", tecReadErr);
      }

      let tecIds = (tecnicos || []).map((t: any) => t.id);

      if (tecIds.length === 0) {
        const { data: novosTecs, error: tecInsertErr } = await (supabase as any)
          .from("tecnicos")
          .insert([
            { nome: "Carlos Silva (Instalação)", especialidade: "Instalação", status: "Ativo", telefone: "(24) 99888-1111" },
            { nome: "Marcos Oliveira (Manutenção)", especialidade: "Manutenção", status: "Ativo", telefone: "(24) 99777-2222" },
            { nome: "Rafael Souza (Geral)", especialidade: "Ambos", status: "Ativo", telefone: "(24) 99666-3333" },
          ])
          .select("id");

        if (tecInsertErr) {
          console.warn("[Seed Funil] Erro ao criar técnicos:", tecInsertErr);
        } else if (novosTecs) {
          tecIds = novosTecs.map((t: any) => t.id);
        }
      }

      // 2. Montar dados dos 19 clientes
      const payload = CLIENTES_TESTE_FUNIL.map((c, idx) => ({
        ...c,
        tecnico_id: tecIds.length > 0 ? tecIds[idx % tecIds.length] : null,
        arquivado: false,
      }));

      // 3. Inserir clientes
      const { data, error } = await (supabase as any)
        .from("clientes")
        .insert(payload)
        .select("id, nome, status, valor_orcamento");

      if (error) {
        console.error("[Seed Funil Error]", error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        count: data?.length || payload.length,
        clientes: data || [],
      };
    } catch (err: any) {
      console.error("[serverSeedFunnelClients]", err);
      return { success: false, error: err.message || "Erro inesperado ao gerar clientes." };
    }
  });

export const serverClearFunnelTestClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    try {
      const { error } = await (supabase as any)
        .from("clientes")
        .delete()
        .eq("origem_importacao", "SEED_TESTE_FUNIL");

      if (error) {
        console.error("[Clear Funil Error]", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error("[serverClearFunnelTestClients]", err);
      return { success: false, error: err.message || "Erro inesperado ao limpar clientes." };
    }
  });
