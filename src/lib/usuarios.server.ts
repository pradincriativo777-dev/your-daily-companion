import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireCrmAdmin } from "./authorization.server";
import { PERFIS_SISTEMA } from "./rbac";

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
    // 1. Buscar perfis existentes no banco
    const { data: perfis, error } = await (supabase.from as any)("perfis_usuarios")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw new Error("Não foi possível carregar os usuários.");
    return (perfis || []) as UsuarioPerfilRow[];
  });

export const toggleUsuarioStatusServer = createServerFn({ method: "POST" })
  .middleware([requireCrmAdmin])
  .validator((data: unknown) => z.object({ usuarioId: z.string().uuid(), novoStatus: z.boolean() }).parse(data))
  .handler(async (ctx) => {
    const { usuarioId, novoStatus } = ctx.data;
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

export const criarUsuarioServer = createServerFn({ method: "POST" })
  .middleware([requireCrmAdmin])
  .validator((data: unknown) => z.object({
    email: z.string().trim().email().max(254),
    nome: z.string().trim().min(1).max(200),
    perfil: z.string().refine((value) => PERFIS_SISTEMA.includes(value as typeof PERFIS_SISTEMA[number]), "Perfil inválido."),
    senha: z.string().min(8).max(128),
  }).parse(data))
  .handler(async (ctx) => {
    const { email, nome, perfil, senha } = ctx.data;
    const supabase = ctx.context.supabase;
    
    // Verifica permissão (apenas um check básico)
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;
    
    if (!currentUser) throw new Error("Não autorizado");

    const SUPABASE_URL = process.env['SUPABASE_URL'] || process.env['VITE_SUPABASE_URL'];
    const SUPABASE_ANON_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'] || process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase environment variables.");
    }

    // 1. Criar usuário no Supabase Auth usando o client Anônimo (signUp)
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: novoUserAuth, error: authErr } = await supabaseAnon.auth.signUp({
      email,
      password: senha,
      options: {
        data: { name: nome }
      }
    });

    if (authErr) {
      throw new Error(`Erro ao criar no Auth: ${authErr.message}`);
    }

    if (!novoUserAuth.user?.id) {
      throw new Error("Erro desconhecido ao criar usuário. Talvez o e-mail já exista.");
    }

    // 2. Inserir o perfil na tabela `perfis_usuarios` (usando o token do admin atual)
    const { data: novoPerfil, error: perfilErr } = await (supabase.from as any)("perfis_usuarios")
      .insert({
        user_id: novoUserAuth.user.id,
        email,
        nome,
        perfil,
        ativo: true
      })
      .select()
      .single();

    if (perfilErr) {
      throw new Error(`Erro ao inserir perfil: ${perfilErr.message}`);
    }

    // Registrar log
    await (supabase.from as any)("auditoria_acessos").insert({
      usuario_id: currentUser.id,
      usuario_email: currentUser.email,
      acao: "CRIAR_USUARIO",
      modulo: "USUARIOS",
      detalhes: { novo_usuario_email: email, perfil_atribuido: perfil },
    });

    return novoPerfil;
  });

