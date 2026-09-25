import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TarefaPayload {
  id?: string;
  titulo: string;
  descricao?: string;
  responsavel_id?: string;
  prioridade?: "Baixa" | "Média" | "Alta" | "Urgente";
  prazo?: string;
  status?: "Pendente" | "Em Andamento" | "Concluída" | "Cancelada";
  cliente_id?: string;
  ordem_servico_id?: string;
}

export const fetchTarefasServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const { data, error } = await (ctx.context.supabase.from as any)("tarefas")
      .select("*, clientes(nome), ordens_servico(id)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Tarefas Server Error]:", error.message);
      return [];
    }
    return data || [];
  });

export const upsertTarefaServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const payload = (ctx.data || {}) as TarefaPayload;
    if (!payload.titulo || !payload.titulo.trim()) {
      throw new Error("O título da tarefa é obrigatório.");
    }

    const { data, error } = await (ctx.context.supabase.from as any)("tarefas")
      .upsert({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[Upsert Tarefa Error]:", error.message);
      throw new Error(`Falha ao salvar tarefa: ${error.message}`);
    }
    return data;
  });
