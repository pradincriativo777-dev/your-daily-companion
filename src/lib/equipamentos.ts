export type EquipamentoCategoria =
  | "reservatório térmico"
  | "coletor solar"
  | "controlador"
  | "bomba de circulação"
  | "resistência elétrica"
  | "misturador"
  | "tubulação"
  | "válvula"
  | "chuveiro"
  | "outro"
  | string;

export const CATEGORIAS_EQUIPAMENTO_INICIAIS: { value: string; label: string }[] = [
  { value: "reservatório térmico", label: "Reservatório Térmico" },
  { value: "coletor solar", label: "Coletor Solar" },
  { value: "controlador", label: "Controlador" },
  { value: "bomba de circulação", label: "Bomba de Circulação" },
  { value: "resistência elétrica", label: "Resistência Elétrica" },
  { value: "misturador", label: "Misturador" },
  { value: "tubulação", label: "Tubulação" },
  { value: "válvula", label: "Válvula" },
  { value: "chuveiro", label: "Chuveiro" },
  { value: "outro", label: "Outro" },
];

export type EquipamentoEstado =
  | "Ativo"
  | "Em manutenção"
  | "Aguardando peça"
  | "Substituído"
  | "Removido"
  | "Arquivado";

export const EQUIPAMENTO_ESTADOS_LIST: EquipamentoEstado[] = [
  "Ativo",
  "Em manutenção",
  "Aguardando peça",
  "Substituído",
  "Removido",
  "Arquivado",
];

export type EstadoGarantiaCalculado =
  | "Vigente"
  | "Próxima do vencimento"
  | "Vencida"
  | "Sem informação suficiente";

export interface CalcularEstadoGarantiaParams {
  dataInicio?: string | null;
  dataTermino?: string | null;
  diasAlerta?: number; // padrão: 30 dias
  dataReferencia?: Date; // padrão: hoje no fuso local
}

/**
  Calcula dinamicamente o estado de uma garantia com base nas datas no fuso America/Sao_Paulo
 */
export function calcularEstadoGarantia({
  dataTermino,
  diasAlerta = 30,
  dataReferencia = new Date(),
}: CalcularEstadoGarantiaParams): EstadoGarantiaCalculado {
  if (!dataTermino || !dataTermino.trim()) {
    return "Sem informação suficiente";
  }

  // Ajusta datas zerando o horário para comparar estritamente dias
  const dtTermino = new Date(dataTermino + "T00:00:00");
  if (isNaN(dtTermino.getTime())) {
    return "Sem informação suficiente";
  }

  const dtRef = new Date(
    dataReferencia.getFullYear(),
    dataReferencia.getMonth(),
    dataReferencia.getDate(),
  );

  const diffMs = dtTermino.getTime() - dtRef.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return "Vencida";
  } else if (diffDias <= diasAlerta) {
    return "Próxima do vencimento";
  } else {
    return "Vigente";
  }
}

/**
  Calcula a data da próxima manutenção preventiva somando meses à data base
 */
export function calcularProximaManutencao(
  dataBase: string | null | undefined,
  periodicidadeMeses: number,
): string | null {
  if (!dataBase || !dataBase.trim() || !periodicidadeMeses || periodicidadeMeses <= 0) {
    return null;
  }

  const dt = new Date(dataBase + "T00:00:00");
  if (isNaN(dt.getTime())) return null;

  dt.setMonth(dt.getMonth() + Number(periodicidadeMeses));
  const resStr = dt.toISOString().split("T")[0];
  return resStr || null;
}

/**
  Valida se o número de série é único entre os equipamentos informados
 */
export function validarNumeroSerieDuplicado(
  numeroSerie: string | null | undefined,
  equipamentoIdAtual: string | null | undefined,
  listaEquipamentos: Array<{ id: string; numero_serie?: string | null; estado?: string }>,
): { duplicado: boolean; erro?: string } {
  if (!numeroSerie || !numeroSerie.trim()) {
    return { duplicado: false };
  }

  const serialClean = numeroSerie.trim().toLowerCase();

  const existe = listaEquipamentos.some((eq) => {
    if (eq.id === equipamentoIdAtual) return false;
    if (eq.estado === "Arquivado" || eq.estado === "Removido") return false;
    return (eq.numero_serie || "").trim().toLowerCase() === serialClean;
  });

  if (existe) {
    return {
      duplicado: true,
      erro: `Já existe um equipamento cadastrado com o número de série "${numeroSerie.trim()}".`,
    };
  }

  return { duplicado: false };
}

/**
  Verifica se a alteração de estado é restrita e exige permissão de Administrador
 */
export function validarPermissaoEstadoEquipamento(
  novoEstado: EquipamentoEstado,
  userRole?: string,
): { permitido: boolean; erro?: string } {
  const estadosRestritos = ["Substituído", "Removido", "Arquivado"];
  if (estadosRestritos.includes(novoEstado) && userRole !== "admin") {
    return {
      permitido: false,
      erro: "Somente administradores podem arquivar, substituir ou remover equipamentos.",
    };
  }
  return { permitido: true };
}

/**
  Verifica se já existe uma OS em Rascunho para um determinado alerta de manutenção preventiva
 */
export function verificarOSDuplicadaParaAlerta(
  planoId: string,
  ordensExistentes: Array<{ status: string; observacoes_internas?: string | null }>,
): boolean {
  return ordensExistentes.some((os) => {
    if (os.status !== "Rascunho" && os.status !== "Cancelada") {
      // Se já houver uma OS em andamento ou rascunho vinculada
      if ((os.observacoes_internas || "").includes(`PLANO_ID:${planoId}`)) {
        return true;
      }
    }
    if (os.status === "Rascunho" && (os.observacoes_internas || "").includes(`PLANO_ID:${planoId}`)) {
      return true;
    }
    return false;
  });
}
