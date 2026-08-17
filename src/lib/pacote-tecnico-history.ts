export interface PacoteTecnicoHistoricoItem {
  id: string;
  ordemId: string;
  versao: string;
  versaoNum: number;
  geradoEm: string;
  geradoPorEmail?: string | null;
  tecnicoDestinatario?: string | null;
  statusEnvio: "Gerado" | "Aguardando envio" | "Enviado manualmente";
  enviadoEm?: string | null;
  enviadoPorEmail?: string | null;
  canalEnvio?: string | null;
  observacaoEnvio?: string | null;
  materiaisCount: number;
  etapasCount: number;
}

const HISTORICO_PACOTES_KEY = "jansol_ordens_pacotes_historico";

/**
 * Obtém a lista completa do histórico de versões de pacotes do técnico gerados para uma OS.
 */
export function obterHistoricoPacotes(ordemId: string): PacoteTecnicoHistoricoItem[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(HISTORICO_PACOTES_KEY);
    if (!raw) return [];
    const todos = JSON.parse(raw) as PacoteTecnicoHistoricoItem[];
    return todos.filter((h) => h.ordemId === ordemId).sort((a, b) => b.versaoNum - a.versaoNum);
  } catch {
    return [];
  }
}

/**
 * Retorna o número da última versão gerada para uma OS (retorna 0 se nunca tiver sido gerada).
 */
export function obterUltimaVersaoGerada(ordemId: string): number {
  const historico = obterHistoricoPacotes(ordemId);
  if (historico.length === 0) return 0;
  return Math.max(...historico.map((h) => h.versaoNum));
}

/**
 * Registra a geração de uma nova versão do pacote do técnico.
 */
export function registrarGeracaoPacote(
  ordemId: string,
  versaoNum: number,
  geradoPorEmail?: string | null,
  tecnicoDestinatario?: string | null,
  materiaisCount = 0,
  etapasCount = 0
): PacoteTecnicoHistoricoItem {
  const novoItem: PacoteTecnicoHistoricoItem = {
    id: `pacote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ordemId,
    versao: `v${versaoNum}`,
    versaoNum,
    geradoEm: new Date().toISOString(),
    geradoPorEmail: geradoPorEmail || null,
    tecnicoDestinatario: tecnicoDestinatario || null,
    statusEnvio: "Aguardando envio",
    materiaisCount,
    etapasCount,
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(HISTORICO_PACOTES_KEY);
      const todos: PacoteTecnicoHistoricoItem[] = raw ? JSON.parse(raw) : [];
      todos.unshift(novoItem);
      localStorage.setItem(HISTORICO_PACOTES_KEY, JSON.stringify(todos));
    } catch (err) {
      console.error("Erro ao registrar geração do pacote do técnico:", err);
    }
  }

  return novoItem;
}

/**
 * Registra a confirmação manual de envio do pacote do técnico.
 */
export function marcarPacoteEnviadoManualmente(
  ordemId: string,
  versao: string,
  enviadoPorEmail?: string | null,
  canal = "WhatsApp / Auvo Chat",
  observacao?: string | null
): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;

  try {
    const raw = localStorage.getItem(HISTORICO_PACOTES_KEY);
    if (!raw) return false;

    const todos: PacoteTecnicoHistoricoItem[] = JSON.parse(raw);
    let encontrado = false;

    const atualizados = todos.map((item) => {
      if (item.ordemId === ordemId && item.versao === versao) {
        encontrado = true;
        return {
          ...item,
          statusEnvio: "Enviado manualmente" as const,
          enviadoEm: new Date().toISOString(),
          enviadoPorEmail: enviadoPorEmail || item.geradoPorEmail || null,
          canalEnvio: canal,
          observacaoEnvio: observacao || null,
        };
      }
      return item;
    });

    if (encontrado) {
      localStorage.setItem(HISTORICO_PACOTES_KEY, JSON.stringify(atualizados));
      return true;
    }
  } catch (err) {
    console.error("Erro ao marcar pacote como enviado:", err);
  }

  return false;
}
