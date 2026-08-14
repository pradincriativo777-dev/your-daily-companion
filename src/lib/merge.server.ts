import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

      if (!userId) {
        logSecurityEvent({
          event: "MERGE_UNAUTHORIZED",
          reason: "Sem sessão válida via middleware",
        });
        return { success: false, error: "Acesso negado. Faça login como administrador." };
      }
      
      const { data: auditId, error: mergeError } = await (supabaseAdmin.rpc as any)("execute_merge_transaction", {
        p_principal_id: data.principalId,
        p_secondary_ids: data.secondaryIds,
        p_final_data: data.finalData,
        p_admin_id: userId,
      });

      if (mergeError) {
        console.error("RPC Error:", mergeError);
        logSecurityEvent({
          event: "MERGE_FAILED",
          userId: userId,
          reason: mergeError.message,
          meta: { principalId: data.principalId }
        });
        return { success: false, error: "Não foi possível concluir a mesclagem. Nenhum dado foi alterado." };
      }

      logSecurityEvent({
        event: "MERGE_SUCCESS",
        userId: userId,
        meta: { 
          auditId, 
          principalId: data.principalId, 
          archivedCount: data.secondaryIds.length 
        }
      });

      return { success: true, auditId };
    } catch (err: any) {
      console.error("Merge Exception:", err.message);
      return { success: false, error: "Não foi possível concluir a mesclagem. Nenhum dado foi alterado." };
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

      if (!userId) {
        return { success: false, error: "Acesso negado." };
      }
      
      const { data: result, error: undoError } = await (supabaseAdmin.rpc as any)("undo_merge_transaction", {
        p_audit_id: data.auditId,
        p_admin_id: userId,
      });

      if (undoError) {
        console.error("Undo RPC Error:", undoError);
        return { success: false, error: "Não foi possível desfazer a mesclagem. Nenhum dado foi alterado." };
      }

      logSecurityEvent({
        event: "UNDO_MERGE_SUCCESS",
        userId: userId,
        meta: { auditId: data.auditId }
      });

      return { success: true, result };
    } catch (err: any) {
      console.error("Undo Exception:", err.message);
      return { success: false, error: "Não foi possível desfazer a mesclagem. Nenhum dado foi alterado." };
    }
  });

export const serverGetMergeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const userId = context.userId;

      if (!userId) {
        throw new Error("Acesso negado.");
      }
      
      const { data, error } = await (supabaseAdmin as any)
        .from("merge_audits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (err: any) {
      console.error("History Exception:", err.message);
      return [];
    }
  });
