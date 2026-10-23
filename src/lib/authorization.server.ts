import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveAdmin, type CrmProfile } from "./authorization";

export const requireCrmAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    // Read the actual active profile; do not trust a permissive is_admin RPC.
    const { data, error } = await (context.supabase.from as any)("perfis_usuarios")
      .select("user_id, perfil, ativo")
      .eq("user_id", context.userId)
      .single();
    if (error) throw new Error("Não foi possível verificar a permissão administrativa.");
    assertActiveAdmin(data as CrmProfile | null);
    return next();
  });
