export type OrdemStatus =
  | "Rascunho"
  | "Aguardando agendamento"
  | "Agendada"
  | "Em deslocamento"
  | "Em atendimento"
  | "Aguardando peça"
  | "Aguardando cliente"
  | "Concluída"
  | "Cancelada";

export const ORDENS_STATUS_LIST: OrdemStatus[] = [
  "Rascunho",
  "Aguardando agendamento",
  "Agendada",
  "Em deslocamento",
  "Em atendimento",
  "Aguardando peça",
  "Aguardando cliente",
  "Concluída",
  "Cancelada",
];

export interface CalculoFinanceiroOSParams {
  valorOrcado: number;
  valorAprovado: number;
  valorRecebido: number;
  gastos: Array<{
    categoria: string;
    valor: number | null;
  }>;
}

export interface ResultadoFinanceiroOS {
  valorOrcado: number;
  valorAprovado: number;
  valorRecebido: number;
  custoMateriais: number;
  custoDeslocamento: number;
  custoTerceiros: number;
  outrosGastos: number;
  custoTotal: number;
  resultadoBruto: number;
  margemPercentual: number | null;
  situacaoPagamento: "Pendente" | "Parcial" | "Pago" | "Estornado";
  temInformacaoSuficiente: boolean;
}

/**
  Arredonda valor numérico para 2 casas decimais (precisão exata de centavos)
 */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
  Formata valor para exibição em Reais (BRL)
 */
export function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

/**
  Formata porcentagem com 1 casa decimal
 */
export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0,0%";
  return `${val.toFixed(1).replace(".", ",")}%`;
}

/**
  Calcula todos os indicadores financeiros de uma Ordem de Serviço
 */
export function calcularFinanceiroOS(
  params: CalculoFinanceiroOSParams,
): ResultadoFinanceiroOS {
  const valorOrcado = roundCurrency(Math.max(0, params.valorOrcado || 0));
  const valorAprovado = roundCurrency(Math.max(0, params.valorAprovado || 0));
  const valorRecebido = roundCurrency(Math.max(0, params.valorRecebido || 0));

  let custoMateriais = 0;
  let custoDeslocamento = 0;
  let custoTerceiros = 0;
  let outrosGastos = 0;

  for (const g of params.gastos || []) {
    const v = roundCurrency(g.valor || 0);
    const cat = (g.categoria || "").toLowerCase();

    if (cat.includes("materia") || cat.includes("peça") || cat.includes("peca")) {
      custoMateriais += v;
    } else if (cat.includes("desloc") || cat.includes("combust") || cat.includes("viagem")) {
      custoDeslocamento += v;
    } else if (cat.includes("terceir") || cat.includes("extern")) {
      custoTerceiros += v;
    } else {
      outrosGastos += v;
    }
  }

  custoMateriais = roundCurrency(custoMateriais);
  custoDeslocamento = roundCurrency(custoDeslocamento);
  custoTerceiros = roundCurrency(custoTerceiros);
  outrosGastos = roundCurrency(outrosGastos);

  const custoTotal = roundCurrency(
    custoMateriais + custoDeslocamento + custoTerceiros + outrosGastos,
  );

  const resultadoBruto = roundCurrency(valorRecebido - custoTotal);

  // A margem só deve ser calculada quando o valor recebido for maior que zero
  const margemPercentual =
    valorRecebido > 0
      ? roundCurrency(((valorRecebido - custoTotal) / valorRecebido) * 100)
      : null;

  let situacaoPagamento: "Pendente" | "Parcial" | "Pago" | "Estornado" = "Pendente";
  if (valorRecebido >= valorAprovado && valorAprovado > 0) {
    situacaoPagamento = "Pago";
  } else if (valorRecebido > 0 && valorRecebido < valorAprovado) {
    situacaoPagamento = "Parcial";
  }

  const temInformacaoSuficiente =
    valorOrcado > 0 || valorAprovado > 0 || valorRecebido > 0 || custoTotal > 0;

  return {
    valorOrcado,
    valorAprovado,
    valorRecebido,
    custoMateriais,
    custoDeslocamento,
    custoTerceiros,
    outrosGastos,
    custoTotal,
    resultadoBruto,
    margemPercentual,
    situacaoPagamento,
    temInformacaoSuficiente,
  };
}

/**
  Valida se um cancelamento possui motivo obrigatório
 */
export function validarCancelamentoOrdem(
  novoStatus: string,
  motivoCancelamento?: string | null,
): { valido: boolean; erro?: string } {
  if (novoStatus === "Cancelada") {
    if (!motivoCancelamento || !motivoCancelamento.trim()) {
      return {
        valido: false,
        erro: "É obrigatório fornecer o motivo do cancelamento.",
      };
    }
  }
  return { valido: true };
}

/**
  Gera um código único de ordem para modo offline/testes (ex: OS-2026-9999)
 */
export function gerarCodigoOrdemFallback(seq: number = 1): string {
  const ano = new Date().getFullYear();
  const num = String(seq).padStart(4, "0");
  return `OS-${ano}-${num}`;
}
