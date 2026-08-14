import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const serverExecuteCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown): {
    clienteId: string;
    valoresAnteriores: Record<string, any>;
    valoresNovos: Record<string, any>;
    motivoCorrecao: string;
  } => data as any)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: auditId, error } = await (supabase as any).rpc("execute_correction_transaction", {
      p_cliente_id: data.clienteId,
      p_valores_anteriores: data.valoresAnteriores,
      p_valores_novos: data.valoresNovos,
      p_admin_id: userId,
      p_motivo_correcao: data.motivoCorrecao,
    });

    if (error) {
      console.error("[Correction Error]", error);
      throw new Error(error.message);
    }

    return { success: true, auditId };
  });

export const serverUndoCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown): { auditId: string } => data as any)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await (supabase as any).rpc("undo_correction_transaction", {
      p_audit_id: data.auditId,
      p_admin_id: userId,
    });

    if (error) {
      console.error("[Undo Correction Error]", error);
      throw new Error(error.message);
    }

    return { success: true };
  });

export const serverGetCorrectionHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data, error } = await (supabase as any)
      .from("correction_audits")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  });
