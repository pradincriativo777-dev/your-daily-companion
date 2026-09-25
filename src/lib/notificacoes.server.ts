import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface NotificacaoPayload {
  id?: string;
  destinatario_id?: string;
  tipo?: string;
  mensagem: string;
  registro_vinculado_id?: string;
  lida?: boolean;
}

export const fetchNotificacoesServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const { data, error } = await (ctx.context.supabase.from as any)("notificacoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Notificacoes Server Error]:", error.message);
      return [];
    }
    return data || [];
  });

export const marcarNotificacoesLidasServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const { ids } = (ctx.data || {}) as { ids?: string[] };
    let query = (ctx.context.supabase.from as any)("notificacoes").update({ lida: true });

    if (ids && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { error } = await query;
    if (error) {
      console.error("[Marcar Lidas Error]:", error.message);
      throw new Error(`Falha ao atualizar notificações: ${error.message}`);
    }
    return { success: true };
  });
