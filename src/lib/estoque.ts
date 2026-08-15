import { supabase } from "@/integrations/supabase/client";

export const CATEGORIAS_ESTOQUE_INICIAIS = [
  { value: "reservatórios", label: "Reservatórios" },
  { value: "coletores", label: "Coletores" },
  { value: "controladores", label: "Controladores" },
  { value: "bombas", label: "Bombas" },
  { value: "resistências", label: "Resistências" },
  { value: "válvulas", label: "Válvulas" },
  { value: "conexões", label: "Conexões" },
  { value: "tubulações", label: "Tubulações" },
  { value: "misturadores", label: "Misturadores" },
  { value: "materiais elétricos", label: "Materiais Elétricos" },
  { value: "materiais hidráulicos", label: "Materiais Hidráulicos" },
  { value: "consumíveis", label: "Consumíveis" },
  { value: "outros", label: "Outros" },
] as const;

export const UNIDADES_MEDIDA_LIST = [
  "unidade",
  "metro",
  "quilograma",
  "litro",
  "caixa",
  "kit",
  "outro",
] as const;

export type TipoMovimentacaoEstoque =
  | "entrada"
  | "reserva"
  | "consumo"
  | "devolucao"
  | "ajuste_inventario"
  | "perda_avaria"
  | "devolucao_fornecedor"
  | "estorno";

export interface MovimentacaoSimples {
  tipo: string;
  quantidade: number;
  custo_unitario?: number;
}

/**
 * Calcula os saldos derivantes do livro razão imutável de movimentações.
 * Saldo Físico = sum(entradas, devolucoes, estornos, ajustes positivos) - sum(consumos, perdas, devolucoes_fornecedor, ajustes negativos)
 * Saldo Reservado = sum(reservas) - sum(consumos_de_reserva, devolucoes_de_reserva)
 */
export function calcularSaldosEstoque(movimentacoes: MovimentacaoSimples[]) {
  let saldoFisico = 0;
  let saldoReservado = 0;

  for (const m of movimentacoes) {
    const qtd = Number(m.quantidade) || 0;
    switch (m.tipo) {
      case "entrada":
      case "devolucao":
        saldoFisico += qtd;
        break;
      case "reserva":
        saldoReservado += qtd;
        break;
      case "consumo":
        saldoFisico -= qtd;
        // Se consumiu uma reserva prévia, libera a reserva correspondente
        if (saldoReservado >= qtd) {
          saldoReservado -= qtd;
        } else {
          saldoReservado = 0;
        }
        break;
      case "perda_avaria":
      case "devolucao_fornecedor":
        saldoFisico -= qtd;
        break;
      case "ajuste_inventario":
        // Pode ser positivo ou negativo (passado em m.quantidade)
        saldoFisico += qtd;
        break;
      case "estorno":
        saldoFisico += qtd;
        break;
    }
  }

  const saldoDisponivel = saldoFisico - saldoReservado;

  return {
    saldoFisico: Number(saldoFisico.toFixed(3)),
    saldoReservado: Number(saldoReservado.toFixed(3)),
    saldoDisponivel: Number(saldoDisponivel.toFixed(3)),
  };
}

/**
 * Calcula o Novo Custo Médio Ponderado após entrada de mercadorias.
 * Novo Custo Médio = ((Saldo Atual * Custo Médio Atual) + (Qtd Entrada * Custo Entrada)) / (Saldo Atual + Qtd Entrada)
 */
export function calcularCustoMedioPonderado({
  saldoAtual,
  custoMedioAtual,
  qtdEntrada,
  custoEntrada,
}: {
  saldoAtual: number;
  custoMedioAtual: number;
  qtdEntrada: number;
  custoEntrada: number;
}): number {
  const saldoFinal = saldoAtual + qtdEntrada;
  if (saldoFinal <= 0) return custoEntrada;

  const valorTotalAnterior = Math.max(0, saldoAtual) * custoMedioAtual;
  const valorNovaEntrada = qtdEntrada * custoEntrada;
  const novoCusto = (valorTotalAnterior + valorNovaEntrada) / saldoFinal;

  return Number(novoCusto.toFixed(2));
}

/**
 * Valida a disponibilidade de saldo antes de realizar reserva ou consumo.
 */
export function validarSaldoDisponivel({
  saldoDisponivel,
  qtdSolicitada,
  permiteSaldoNegativoAdmin = false,
  userRole = "atendente",
}: {
  saldoDisponivel: number;
  qtdSolicitada: number;
  permiteSaldoNegativoAdmin?: boolean;
  userRole?: string;
}): { permitido: boolean; erro?: string } {
  if (qtdSolicitada <= 0) {
    return { permitido: false, erro: "A quantidade solicitada deve ser maior que zero." };
  }

  if (saldoDisponivel - qtdSolicitada < 0) {
    if (permiteSaldoNegativoAdmin && userRole === "admin") {
      return { permitido: true };
    }
    return {
      permitido: false,
      erro: `Saldo insuficiente em estoque! Saldo disponível: ${saldoDisponivel}. Quantidade solicitada: ${qtdSolicitada}.`,
    };
  }

  return { permitido: true };
}

/**
 * Validação de SKU único.
 */
export function validarSkuUnico(
  sku: string,
  itemIdAtual?: string | null,
  itensExistentes: { id: string; sku: string }[] = [],
): { duplicado: boolean; erro?: string } {
  if (!sku || !sku.trim()) {
    return { duplicado: true, erro: "O código SKU é obrigatório." };
  }

  const skuClean = sku.trim().toUpperCase();
  const existe = itensExistentes.some(
    (i) => i.sku.toUpperCase() === skuClean && i.id !== itemIdAtual,
  );

  if (existe) {
    return {
      duplicado: true,
      erro: `O código SKU "${skuClean}" já pertence a outro item em estoque.`,
    };
  }

  return { duplicado: false };
}

/**
 * Gera um código único amigável de operação para a movimentação.
 */
export function gerarCodigoOperacao(): string {
  const ano = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MOV-${ano}-${rand}`;
}
