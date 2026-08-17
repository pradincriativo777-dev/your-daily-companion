import { AUVO_CHAT_URL } from "./config";

export const AUVO_CHAT_STORAGE_KEY = "jansol_auvo_chat_atendimento";

export interface AuvoChatAtendimentoState {
  clienteId: string;
  clienteNome: string;
  telefoneOriginal?: string | null | undefined;
  telefoneNormalizado: string;
  iniciadoEm: string; // ISO String
  origemRota: string;
  usuarioEmail?: string | null | undefined;
}

export interface ClienteLike {
  id: string;
  nome: string;
  whatsapp?: string | null;
  telefone?: string | null;
}

/**
 * Normaliza número de telefone para cópia e busca no Auvo Chat.
 * Exemplo: "(11) 98765-4321" -> "5511987654321"
 */
export function normalizarTelefoneAuvoChat(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const str = String(rawPhone).trim();
  const digits = str.replace(/\D/g, "");

  if (digits.length < 8) return null;

  // Se o original começava com '+', preserva os dígitos como código internacional completo
  if (str.startsWith("+")) {
    return digits;
  }

  // Telefones brasileiros com DDI 55 (12 ou 13 dígitos) -> preservar
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits;
  }

  // Telefones brasileiros sem DDI (10 ou 11 dígitos) -> adicionar prefixo 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Números internacionais ou outros formatos válidos -> retornar somente dígitos
  return digits;
}

/**
 * Obtém o estado temporário do atendimento pendente armazenado no sessionStorage.
 * Valida a expiração de segurança de 8 horas.
 */
export function getAtendimentoPendente(): AuvoChatAtendimentoState | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(AUVO_CHAT_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as AuvoChatAtendimentoState;
    if (!data || !data.clienteId || !data.iniciadoEm) {
      limparAtendimentoPendente();
      return null;
    }

    const iniciadoMs = new Date(data.iniciadoEm).getTime();
    const agoraMs = Date.now();
    const OITO_HORAS_MS = 8 * 60 * 60 * 1000;

    // Expiração de segurança (8 horas)
    if (agoraMs - iniciadoMs > OITO_HORAS_MS) {
      limparAtendimentoPendente();
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao ler atendimento pendente do sessionStorage:", error);
    limparAtendimentoPendente();
    return null;
  }
}

/**
 * Salva o estado temporário de atendimento pendente no sessionStorage.
 */
export function salvarAtendimentoPendente(state: AuvoChatAtendimentoState): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(AUVO_CHAT_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Erro ao salvar atendimento pendente no sessionStorage:", error);
  }
}

/**
 * Apaga o estado temporário de atendimento do sessionStorage.
 */
export function limparAtendimentoPendente(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(AUVO_CHAT_STORAGE_KEY);
  } catch (error) {
    console.error("Erro ao limpar atendimento pendente do sessionStorage:", error);
  }
}

/**
 * Inicia a ação assistida de atendimento no Auvo Chat:
 * 1. Extrai e normaliza o telefone
 * 2. Copia o telefone normalizado para o clipboard
 * 3. Registra o atendimento pendente no sessionStorage
 * 4. Abre a URL do Auvo Chat em nova aba (target="_blank", rel="noopener,noreferrer")
 */
export function iniciarAtendimentoAuvoChat(
  cliente: ClienteLike,
  origemRota: string,
  options: {
    onNoPhone: (c: ClienteLike) => void;
    onSuccess?: (telefoneNormalizado: string) => void;
    userEmail?: string | null;
  }
): boolean {
  const rawPhone = cliente.whatsapp || cliente.telefone;
  const telNormalizado = normalizarTelefoneAuvoChat(rawPhone);

  if (!telNormalizado) {
    options.onNoPhone(cliente);
    return false;
  }

  // Copiar número para o clipboard se suportado
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(telNormalizado).catch(() => {
      // Ignorar erros de suporte ao clipboard
    });
  }

  // Registrar estado temporário
  salvarAtendimentoPendente({
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    telefoneOriginal: rawPhone,
    telefoneNormalizado: telNormalizado,
    iniciadoEm: new Date().toISOString(),
    origemRota,
    usuarioEmail: options.userEmail || null,
  });

  // Abrir o Auvo Chat em nova aba
  if (typeof window !== "undefined") {
    window.open(AUVO_CHAT_URL, "_blank", "noopener,noreferrer");
  }

  if (options.onSuccess) {
    options.onSuccess(telNormalizado);
  }

  return true;
}
