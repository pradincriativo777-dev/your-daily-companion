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

    // 2. Garantir perfil Administrador para o usuário autenticado atual se a lista estiver vazia ou usuário não estiver cadastrado
    const userEmail = user?.email;
    if (user && userEmail) {
      const existeUsuarioAtual = list.some((u) => u.email.toLowerCase() === userEmail.toLowerCase());
      if (!existeUsuarioAtual) {
        const { data: novousuario, error: insertErr } = await (supabase.from as any)("perfis_usuarios")
          .upsert({
            user_id: user.id,
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
