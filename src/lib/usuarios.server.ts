import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface UsuarioPerfilRow {
  id: string;
  user_id: string | null;
  email: string;
  nome: string;
  perfil: "Administrador" | "Gestor" | "Atendimento" | "Técnico" | "Financeiro" | "Estoque";
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchUsuariosServer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const supabase = ctx.context.supabase;
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    // 1. Buscar perfis existentes no banco
    const { data: perfis, error } = await (supabase.from as any)("perfis_usuarios")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[fetchUsuariosServer Error]:", error.message);
    }

    let list: UsuarioPerfilRow[] = perfis || [];

    // 2. Bootstrap Seguro via Variável de Ambiente CRM_BOOTSTRAP_ADMIN_USER_ID ou CRM_BOOTSTRAP_ADMIN_EMAIL
    const bootstrapAdminId = process.env["CRM_BOOTSTRAP_ADMIN_USER_ID"] || process.env["VITE_CRM_BOOTSTRAP_ADMIN_USER_ID"];
    const bootstrapAdminEmail = process.env["CRM_BOOTSTRAP_ADMIN_EMAIL"] || process.env["VITE_CRM_BOOTSTRAP_ADMIN_EMAIL"] || "admin@jansol.com.br";

    const userEmail = user?.email;
    const userId = user?.id;

    if (user && userEmail) {
      const eBootstrapAuthorized = (bootstrapAdminId && userId === bootstrapAdminId) ||
        (bootstrapAdminEmail && userEmail.toLowerCase() === bootstrapAdminEmail.toLowerCase());

      const existeUsuarioAtual = list.some((u) => u.email.toLowerCase() === userEmail.toLowerCase() || u.user_id === userId);

      if (!existeUsuarioAtual && eBootstrapAuthorized) {
        const { data: novousuario, error: insertErr } = await (supabase.from as any)("perfis_usuarios")
          .upsert({
            user_id: userId,
            email: userEmail,
            nome: userEmail.split("@")[0] || "Administrador",
            perfil: "Administrador",
            ativo: true,
          })
          .select()
          .single();

        if (!insertErr && novousuario) {
          list = [novousuario, ...list];
        }
      }
    }

    return list;
  });

export const toggleUsuarioStatusServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const { usuarioId, novoStatus } = (ctx.data || {}) as { usuarioId: string; novoStatus: boolean };
    const supabase = ctx.context.supabase;
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    if (!usuarioId) throw new Error("ID de usuário inválido.");

    // Trava para evitar desativar a si próprio se for o único admin
    const { data: targetUser } = await (supabase.from as any)("perfis_usuarios")
      .select("*")
      .eq("id", usuarioId)
      .single();

    if (targetUser && targetUser.perfil === "Administrador" && !novoStatus) {
      const { count } = await (supabase.from as any)("perfis_usuarios")
        .select("id", { count: "exact" })
        .eq("perfil", "Administrador")
        .eq("ativo", true);

      if ((count || 0) <= 1) {
        throw new Error("Não é possível desativar o único Administrador ativo do sistema.");
      }
    }

    const { data, error } = await (supabase.from as any)("perfis_usuarios")
      .update({ ativo: novoStatus, updated_at: new Date().toISOString() })
      .eq("id", usuarioId)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao alterar status do usuário: ${error.message}`);
    }

    // Registrar log de auditoria de alteração de acesso
    await (supabase.from as any)("auditoria_acessos").insert({
      usuario_id: currentUser?.id || null,
      usuario_email: currentUser?.email || "sistema",
      acao: novoStatus ? "ATIVAR_USUARIO" : "DESATIVAR_USUARIO",
      modulo: "USUARIOS",
      detalhes: { usuario_afetado: targetUser?.email, novo_status: novoStatus },
    });

    return data;
  });
