import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logSecurityEvent } from "./security-logger";

export const serverExecuteMerge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown): { 
    principalId: string; 
    secondaryIds: string[]; 
    finalData: Record<string, any> 
  } => {
    if (typeof data !== "object" || data === null) throw new Error("Invalid payload");
    const payload = data as Record<string, unknown>;
    
    if (typeof payload["principalId"] !== "string" || !payload["principalId"]) {
      throw new Error("principalId is required");
    }
    if (!Array.isArray(payload["secondaryIds"]) || payload["secondaryIds"].length === 0) {
      throw new Error("secondaryIds must be a non-empty array");
    }
    if (typeof payload["finalData"] !== "object" || payload["finalData"] === null) {
      throw new Error("finalData is required");
    }

    return { 
      principalId: payload["principalId"], 
      secondaryIds: payload["secondaryIds"] as string[], 
      finalData: payload["finalData"] as Record<string, any> 
    };
  })
  .handler(async ({ data, context }) => {
    try {
      const userId = context.userId;
      const supabase = context.supabase;

      if (!userId) {
        logSecurityEvent({
          event: "MERGE_UNAUTHORIZED",
          reason: "Sem sessão válida via middleware",
        });
        return { success: false, error: "Acesso negado. Faça login como administrador." };
      }

      // Verificação de pré-requisitos: Garantir que o usuário atual é admin
      const { data: isAdmin, error: adminCheckError } = await (supabase as any).rpc('is_admin');
      if (adminCheckError || !isAdmin) {
        logSecurityEvent({
          event: "MERGE_UNAUTHORIZED",
          userId: userId,
          reason: "Usuário não possui privilégios de administrador",
        });
        return { success: false, error: "Acesso negado. Esta operação exige privilégios de administrador." };
      }
      
      const { data: mergeId, error } = await (supabase as any).rpc("execute_merge_transaction", {
        p_principal_id: data.principalId,
        p_secondary_ids: data.secondaryIds,
        p_final_data: data.finalData,
        p_admin_id: userId,
      });

      if (error) {
        console.error(`[Merge RPC Error] Usuário ${userId}:`, error.message || error);
        logSecurityEvent({
          event: "MERGE_FAILED",
          userId: userId,
          reason: error.message,
          meta: { principalId: data.principalId }
        });
        return { success: false, error: `Falha no Banco: ${error.message}` };
      }

      logSecurityEvent({
        event: "MERGE_SUCCESS",
        userId: userId,
        meta: { 
          auditId: mergeId, 
          principalId: data.principalId, 
          archivedCount: data.secondaryIds.length 
        }
      });

      return { success: true, auditId: mergeId };
    } catch (err: any) {
      console.error(`[Merge Exception] Usuário ${context.userId}:`, err.message);
      return { success: false, error: "Ocorreu um erro inesperado. Nenhum dado foi alterado." };
    }
  });

export const serverUndoMerge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown): { auditId: string } => {
    if (typeof data !== "object" || data === null) throw new Error("Invalid payload");
    const payload = data as Record<string, unknown>;
    
    if (typeof payload["auditId"] !== "string" || !payload["auditId"]) {
      throw new Error("auditId is required");
    }

    return { auditId: payload["auditId"] };
  })
  .handler(async ({ data, context }) => {
    try {
      const userId = context.userId;
      const supabase = context.supabase;

      if (!userId) {
        return { success: false, error: "Acesso negado." };
      }
      
      // Verificação de pré-requisitos: Garantir que o usuário atual é admin
      const { data: isAdmin, error: adminCheckError } = await (supabase as any).rpc('is_admin');
      if (adminCheckError || !isAdmin) {
        return { success: false, error: "Acesso negado. Esta operação exige privilégios de administrador." };
      }

      const { data: success, error } = await (supabase as any).rpc("undo_merge_transaction", {
        p_audit_id: data.auditId,
        p_admin_id: userId,
      });

      if (error) {
        console.error(`[Undo RPC Error] Usuário ${userId}:`, error.message || error);
        return { success: false, error: "Não foi possível desfazer a mesclagem. Nenhum dado foi alterado." };
      }

      logSecurityEvent({
        event: "UNDO_MERGE_SUCCESS",
        userId: userId,
        meta: { auditId: data.auditId }
      });

      return { success: true, result: success };
    } catch (err: any) {
      console.error(`[Undo Exception] Usuário ${context.userId}:`, err.message);
      return { success: false, error: "Ocorreu um erro inesperado. Nenhum dado foi alterado." };
    }
  });

export const serverGetMergeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const userId = context.userId;
      const supabase = context.supabase;

      if (!userId) {
        throw new Error("Acesso negado.");
      }
      
      const { data, error } = await (supabase as any).from("merge_audits").select("*").order("created_at", { ascending: false }).limit(50);

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (err: any) {
      console.error(`[History Exception] Usuário ${context.userId}:`, err.message);
      return [];
    }
  });
