import { differenceInDays, parseISO } from "date-fns";

export interface ProximaAcaoRecomendada {
  id: string;
  label: string;
  explicacao: string;
  tipo: "primary" | "warning" | "success" | "info";
  icone?: string;
  actionKey: string;
}

export interface ClienteAcaoContexto {
  id: string;
  nome: string;
  telefone?: string | null;
  whatsapp?: string | null;
  ultimo_contato?: string | null;
  ordens_abertas_count?: number;
}

export interface OrdemServicoAcaoContexto {
  id: string;
  codigo: string;
  status: string;
  tecnico_id?: string | null;
  tecnico_nome?: string | null;
  endereco_visita?: string | null;
  valor_orcado?: number;
  valor_recebido?: number;
  materiais_count?: number;
  confirmacao_sem_materiais?: boolean;
}

export interface TarefaAcaoContexto {
  id: string;
  titulo: string;
  status: string;
  data_vencimento?: string | null;
}

/**
 * Calcula a próxima ação recomendada para um CLIENTE com base em regras determinísticas.
 */
export function calcularProximaAcaoCliente(cliente: ClienteAcaoContexto): ProximaAcaoRecomendada {
  const possuiTelefone = Boolean(cliente.telefone || cliente.whatsapp);

  if (!possuiTelefone) {
    return {
      id: "cli-sem-tel",
      label: "Cadastrar Telefone",
      explicacao: "Cliente sem número de telefone ou WhatsApp registrado para atendimento.",
      tipo: "warning",
      actionKey: "editar_cadastro",
    };
  }

  if (cliente.ordens_abertas_count && cliente.ordens_abertas_count > 0) {
    return {
      id: "cli-os-aberta",
      label: "Acompanhar OS em Andamento",
      explicacao: `Cliente possui ${cliente.ordens_abertas_count} Ordem de Serviço em execução.`,
      tipo: "info",
      actionKey: "ver_os_andamento",
    };
  }

  let diasSemContato = 999;
  if (cliente.ultimo_contato) {
    try {
      diasSemContato = differenceInDays(new Date(), parseISO(cliente.ultimo_contato));
    } catch {
      diasSemContato = 999;
    }
  }

  if (diasSemContato > 30) {
    return {
      id: "cli-sem-contato",
      label: "Registrar Novo Contato",
      explicacao: diasSemContato === 999 
        ? "Nenhum contato recente registrado para este cliente." 
        : `Sem interações registradas há ${diasSemContato} dias.`,
      tipo: "warning",
      actionKey: "registrar_contato",
    };
  }

  return {
    id: "cli-padrao",
    label: "Criar Ordem de Serviço",
    explicacao: "Iniciar um novo atendimento técnico ou comercial para este cliente.",
    tipo: "primary",
    actionKey: "criar_os",
  };
}

/**
 * Calcula a próxima ação recomendada para uma ORDEM DE SERVIÇO com base no estado determinístico.
 */
export function calcularProximaAcaoOrdem(ordem: OrdemServicoAcaoContexto): ProximaAcaoRecomendada {
  const status = ordem.status || "Aguardando agendamento";

  if (status === "Cancelada") {
    return {
      id: "os-cancelada",
      label: "Ver Motivo do Cancelamento",
      explicacao: "Ordem de Serviço cancelada. Consultar justificativa registrada.",
      tipo: "warning",
      actionKey: "ver_motivo_cancelamento",
    };
  }

  if (status === "Concluída") {
    const pendenciaFinanceira = (ordem.valor_orcado || 0) > (ordem.valor_recebido || 0);
    if (pendenciaFinanceira) {
      return {
        id: "os-[#D32F2F]",
        label: "Registrar Recebimento Financeiro",
        explicacao: "Serviço concluído aguardando liquidação ou acerto de pagamento.",
        tipo: "warning",
        actionKey: "registrar_recebimento",
      };
    }
    return {
      id: "os-concluida",
      label: "Revisar e Encerrar",
      explicacao: "Ordem concluída e conferida. Tudo certo!",
      tipo: "success",
      actionKey: "revisar_encerrar",
    };
  }

  if (!ordem.tecnico_id && !ordem.tecnico_nome) {
    return {
      id: "os-sem-tecnico",
      label: "Definir Técnico Responsável",
      explicacao: "Atribuir um profissional ou equipe técnica antes da liberação.",
      tipo: "warning",
      actionKey: "definir_tecnico",
    };
  }

  if (!ordem.endereco_visita || !ordem.endereco_visita.trim()) {
    return {
      id: "os-sem-endereco",
      label: "Completar Endereço da Obra",
      explicacao: "Informar o local exato da visita técnica para deslocamento.",
      tipo: "warning",
      actionKey: "editar_endereco",
    };
  }

  const semMateriais = (!ordem.materiais_count || ordem.materiais_count === 0) && !ordem.confirmacao_sem_materiais;
  if (semMateriais) {
    return {
      id: "os-conferir-materiais",
      label: "Conferir Lista de Materiais",
      explicacao: "Verificar se a obra precisa de produtos de estoque ou confirmação sem materiais.",
      tipo: "warning",
      actionKey: "conferir_materiais",
    };
  }

  if (status === "Aguardando agendamento") {
    return {
      id: "os-liberar",
      label: "Liberar para Execução",
      explicacao: "Confirmar agendamento e preparar a obra.",
      tipo: "primary",
      actionKey: "liberar_execucao",
    };
  }

  return {
    id: "os-gerar-pacote",
    label: "Gerar Pacote do Técnico",
    explicacao: "Gerar versão profissional em PDF sanitizada para ser enviada à equipe técnica.",
    tipo: "primary",
    actionKey: "gerar_pacote_tecnico",
  };
}

/**
 * Calcula a próxima ação recomendada para uma TAREFA.
 */
export function calcularProximaAcaoTarefa(tarefa: TarefaAcaoContexto): ProximaAcaoRecomendada {
  if (tarefa.status === "Concluída") {
    return {
      id: "tar-concluida",
      label: "Reabrir Tarefa",
      explicacao: "Tarefa marcada como concluída.",
      tipo: "info",
      actionKey: "reabrir_tarefa",
    };
  }

  let vencida = false;
  if (tarefa.data_vencimento) {
    try {
      vencida = differenceInDays(new Date(), parseISO(tarefa.data_vencimento)) > 0;
    } catch {
      vencida = false;
    }
  }

  if (vencida) {
    return {
      id: "tar-vencida",
      label: "Atualizar ou Concluir Tarefa Vencida",
      explicacao: "O prazo estipulado para esta pendência expirou.",
      tipo: "warning",
      actionKey: "concluir_tarefa",
    };
  }

  return {
    id: "tar-pendente",
    label: "Marcar como Concluída",
    explicacao: "Concluir o registro desta pendência operacional.",
    tipo: "success",
    actionKey: "concluir_tarefa",
  };
}
