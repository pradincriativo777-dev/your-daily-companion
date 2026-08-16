import { supabase } from "@/integrations/supabase/client";

export interface ArquivarClienteParams {
  clienteId: string;
  motivo: string;
  usuarioId?: string;
  usuarioEmail: string;
}

export async function arquivarCliente({ clienteId, motivo, usuarioId, usuarioEmail }: ArquivarClienteParams) {
  if (!clienteId) throw new Error("ID do cliente não informado.");
  if (!motivo || motivo.trim().length < 5) {
    throw new Error("O motivo do arquivamento deve conter pelo menos 5 caracteres.");
  }

  const dataAtual = new Date().toISOString();

  // 1. Atualiza o cadastro do cliente mantendo a constraint condicional satisfeita
  const { error: errorUpdate } = await (supabase.from as any)("clientes")
    .update({
      arquivado: true,
      motivo_arquivamento: motivo.trim(),
      arquivado_em: dataAtual,
      arquivado_por: usuarioId || null,
    })
    .eq("id", clienteId);

  if (errorUpdate) {
    console.error("Erro ao arquivar cliente:", errorUpdate);
    throw new Error(`Falha ao arquivar cliente: ${errorUpdate.message}`);
  }

  // 2. Registra histórico dedicado de arquivamento (sem apagar histórico)
  await (supabase.from as any)("historico_arquivamento").insert({
    cliente_id: clienteId,
    acao: "ARQUIVAR",
    usuario_id: usuarioId || null,
    motivo: motivo.trim(),
  });

  return { success: true };
}

export async function restaurarCliente({
  clienteId,
  motivo = "Restauração solicitada pelo Administrador",
  usuarioId,
  usuarioEmail,
}: {
  clienteId: string;
  motivo?: string;
  usuarioId?: string;
  usuarioEmail: string;
}) {
  if (!clienteId) throw new Error("ID do cliente não informado.");

  // 1. Restaura o cliente
  const { error: errorUpdate } = await (supabase.from as any)("clientes")
    .update({
      arquivado: false,
      motivo_arquivamento: null,
      arquivado_em: null,
      arquivado_por: null,
    })
    .eq("id", clienteId);

  if (errorUpdate) {
    console.error("Erro ao restaurar cliente:", errorUpdate);
    throw new Error(`Falha ao restaurar cliente: ${errorUpdate.message}`);
  }

  // 2. Registra o evento de restauração mantendo a rastreabilidade completa
  await (supabase.from as any)("historico_arquivamento").insert({
    cliente_id: clienteId,
    acao: "RESTAURAR",
    usuario_id: usuarioId || null,
    motivo: motivo.trim(),
  });

  return { success: true };
}
