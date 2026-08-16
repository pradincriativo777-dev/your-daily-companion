import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface KanbanFetchParams {
  status: string;
  page?: number;
  limit?: number;
  cidade?: string;
  tecnicoId?: string;
  tipoSistema?: string;
}

export const fetchKanbanCardsServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const { status, page = 1, limit = 50, cidade, tecnicoId, tipoSistema } = (ctx.data || {}) as KanbanFetchParams;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = (ctx.context.supabase.from as any)("clientes")
      .select("id, nome, status, cidade, tipo_sistema, valor_orcamento, tecnico_id", { count: "exact" })
      .eq("status", status)
      .eq("arquivado", false);

    if (cidade && cidade !== "todas") {
      query = query.eq("cidade", cidade);
    }
    if (tecnicoId && tecnicoId !== "todos") {
      query = query.eq("tecnico_id", tecnicoId);
    }
    if (tipoSistema && tipoSistema !== "todos") {
      query = query.eq("tipo_sistema", tipoSistema);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(start, end);

    if (error) {
      console.error(`[Kanban Server Error] Status ${status}:`, error.message);
      throw new Error(`Erro ao carregar cards do Kanban: ${error.message}`);
    }

    // Deduplicação estrita por ID do Cliente
    const map = new Map<string, any>();
    (data || []).forEach((item: any) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    return {
      status,
      cards: Array.from(map.values()),
      totalCount: count || 0,
      page,
      limit,
      hasMore: (count || 0) > end + 1,
    };
  });
