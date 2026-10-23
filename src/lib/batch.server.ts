import { createServerFn } from "@tanstack/react-start";
import { requireCrmAdmin } from "./authorization.server";
import { auditIdSchema, batchImportSchema } from "./import-validation";

export const serverExecuteBatchImport = createServerFn({ method: "POST" })
  .middleware([requireCrmAdmin])
  .validator((data: unknown) => batchImportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    try {
      const { data: auditId, error } = await (supabase as any).rpc("execute_batch_import_transaction", {
        p_insercoes: data.insercoes,
        p_atualizacoes: data.atualizacoes,
        p_admin_id: userId,
      });

      if (error) {
        console.error("[Batch Import Error]", error);
        throw new Error(error.message);
      }

      return { success: true, auditId };
    } catch (err: any) {
      console.error("[serverExecuteBatchImport]", err);
      return { success: false, error: err.message };
    }
  });

export const serverUndoBatchImport = createServerFn({ method: "POST" })
  .middleware([requireCrmAdmin])
  .validator((data: unknown) => auditIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    try {
      const { error } = await (supabase as any).rpc("undo_batch_import_transaction", {
        p_audit_id: data.auditId,
        p_admin_id: userId,
      });

      if (error) {
        console.error("[Undo Batch Import Error]", error);
        throw new Error(error.message);
      }

      return { success: true };
    } catch (err: any) {
      console.error("[serverUndoBatchImport]", err);
      return { success: false, error: err.message };
    }
  });
