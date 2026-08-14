import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logSecurityEvent } from "./security-logger";

async function getAdminUserFromRequest() {
  try {
    const request = getRequest();
    const token = request?.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    
    // Validar token e obter usuário usando a conexão segura já existente no projeto (Service Role)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    
    return user;
  } catch (error) {
    return null;
  }
}

export const serverExecuteMerge = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    try {
      const user = await getAdminUserFromRequest();

      if (!user) {
        logSecurityEvent({
          event: "MERGE_UNAUTHORIZED",
          reason: "Sem sessão válida",
        });
        return { success: false, error: "Acesso negado. Faça login como administrador." };
      }
      
      const { data: auditId, error: mergeError } = await (supabaseAdmin.rpc as any)("execute_merge_transaction", {
        p_principal_id: data.principalId,
        p_secondary_ids: data.secondaryIds,
        p_final_data: data.finalData,
        p_admin_id: user.id,
      });

      if (mergeError) {
        console.error("RPC Error:", mergeError);
        logSecurityEvent({
          event: "MERGE_FAILED",
          userId: user.id,
          reason: mergeError.message,
          meta: { principalId: data.principalId }
        });
        return { success: false, error: "Não foi possível concluir a mesclagem. Nenhum dado foi alterado." };
      }

      logSecurityEvent({
        event: "MERGE_SUCCESS",
        userId: user.id,
        meta: { 
          auditId, 
          principalId: data.principalId, 
          archivedCount: data.secondaryIds.length 
        }
      });

      return { success: true, auditId };
    } catch (err: any) {
      console.error("Merge Exception:", err.message);
      // Nunca expor detalhes internos ao usuário final, como "Missing Supabase env vars"
      return { success: false, error: "Não foi possível concluir a mesclagem. Nenhum dado foi alterado." };
    }
  });

export const serverUndoMerge = createServerFn({ method: "POST" })
  .validator((data: unknown): { auditId: string } => {
    if (typeof data !== "object" || data === null) throw new Error("Invalid payload");
    const payload = data as Record<string, unknown>;
    
    if (typeof payload["auditId"] !== "string" || !payload["auditId"]) {
      throw new Error("auditId is required");
    }

    return { auditId: payload["auditId"] };
  })
  .handler(async ({ data }) => {
    try {
      const user = await getAdminUserFromRequest();

      if (!user) {
        return { success: false, error: "Acesso negado." };
      }
      
      const { data: result, error: undoError } = await (supabaseAdmin.rpc as any)("undo_merge_transaction", {
        p_audit_id: data.auditId,
        p_admin_id: user.id,
      });

      if (undoError) {
        console.error("Undo RPC Error:", undoError);
        return { success: false, error: "Não foi possível desfazer a mesclagem. Nenhum dado foi alterado." };
      }

      logSecurityEvent({
        event: "UNDO_MERGE_SUCCESS",
        userId: user.id,
        meta: { auditId: data.auditId }
      });

      return { success: true, result };
    } catch (err: any) {
      console.error("Undo Exception:", err.message);
      return { success: false, error: "Não foi possível desfazer a mesclagem. Nenhum dado foi alterado." };
    }
  });

export const serverGetMergeHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const user = await getAdminUserFromRequest();

      if (!user) {
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
