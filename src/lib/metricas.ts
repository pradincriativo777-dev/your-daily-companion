import { Cliente, OrdemServico, Manutencao, Gasto } from "@/hooks/use-crm";

export interface MetricaResultado<T> {
  valor: T;
  formatado: string;
  disponivel: boolean;
  fonte: string;
  periodo: string;
  observacao?: string;
}

export interface FiltroPeriodoMetricas {
  dataInicio?: Date | string | null;
  dataFim?: Date | string | null;
}

/**
 * CAMADA CENTRALIZADA E ÚNICA DE CÁLCULO DE MÉTRICAS (CRM JANSOL)
 * Utilizada simultaneamente pelo Dashboard (/dashboard) e pelos Relatórios (/dashboard/relatorios)
 * para garantir 100% de consistência entre todas as páginas.
 */

function estaNoPeriodo(dataStr: string | null | undefined, filtro?: FiltroPeriodoMetricas): boolean {
  if (!dataStr) return false;
  const d = new Date(dataStr + (dataStr.includes("T") ? "" : "T00:00:00"));
  if (isNaN(d.getTime())) return false;

  if (filtro?.dataInicio) {
    const inicio = new Date(filtro.dataInicio);
    if (d < inicio) return false;
  }
  if (filtro?.dataFim) {
    const fim = new Date(filtro.dataFim);
    if (d > fim) return false;
  }
  return true;
}

export function calcularMetricasOficiais({
  clientes = [],
  ordensServico = [],
  manutencoes = [],
  gastos = [],
  filtroPeriodo,
}: {
  clientes: Cliente[];
  ordensServico?: OrdemServico[];
  manutencoes?: Manutencao[];
  gastos?: Gasto[];
  filtroPeriodo?: FiltroPeriodoMetricas;
}) {
  // Excluir registros de teste ou arquivados dos indicadores oficiais
  const clientesValidos = clientes.filter(
    (c) => !(c as any).is_test && !(c as any).arquivado,
  );

  const temFiltroData = !!(filtroPeriodo?.dataInicio || filtroPeriodo?.dataFim);
  const descricaoPeriodo = temFiltroData
    ? "Período selecionado no filtro"
    : "Todo o histórico cadastrado";

  // 1. FATURAMENTO REAL
  // Regra: Somente valores pagos confirmados (valor_pago) de clientes ou ordens concluídas.
  // Não considera o status "Orçamento" como faturamento real.
  const clientesFiltrados = temFiltroData
    ? clientesValidos.filter((c) => estaNoPeriodo(c.data_instalacao || c.created_at, filtroPeriodo))
    : clientesValidos;

  const faturamentoReal = clientesFiltrados.reduce((acc, c) => {
    // Apenas status reais instalados/finalizados
    if (c.status === "Instalado" || c.status === "Finalizado" || c.status === "Aprovado") {
      return acc + (Number(c.valor_pago) || 0);
    }
    return acc;
  }, 0);

  // 2. ORÇAMENTOS PENDENTES
  // Regra: Exibir "Não disponível" até haver integração real com Conta Azul ou módulo de orçamento.
  const orcamentosPendentes: MetricaResultado<null> = {
    valor: null,
    formatado: "Não disponível",
    disponivel: false,
    fonte: "Aguardando integração Conta Azul / Módulo de Orçamentos",
    periodo: descricaoPeriodo,
    observacao: "Status 'Orçamento' do cadastro de clientes não representa orçamento financeiro pendente real.",
  };

  // 3. TAXA DE CONVERSÃO DE CLIENTES
  // Fórmula: (Clientes Aprovados + Instalados + Finalizados) / Total de Clientes Válidos * 100
  const convertidos = clientesFiltrados.filter((c) =>
    ["Aprovado", "Instalado", "Finalizado"].includes(c.status),
  ).length;

  const totalBase = clientesFiltrados.length;
  const taxaConversaoPct = totalBase > 0 ? (convertidos / totalBase) * 100 : null;

  const taxaConversao: MetricaResultado<number | null> = {
    valor: taxaConversaoPct,
    formatado: taxaConversaoPct !== null ? `${taxaConversaoPct.toFixed(1)}%` : "Sem informação",
    disponivel: taxaConversaoPct !== null,
    fonte: "Tabela public.clientes (is_test = false)",
    periodo: descricaoPeriodo,
    observacao: `Fórmula: (${convertidos} convertidos / ${totalBase} clientes válidos) × 100`,
  };

  // 4. TICKET MÉDIO
  // Regra: Calculado apenas entre clientes com orçamento/faturamento maior que zero. Não substitui dados por zero.
  const clientesComValor = clientesFiltrados.filter(
    (c) => (Number(c.valor_orcamento) || 0) > 0 || (Number(c.valor_pago) || 0) > 0,
  );

  const somaValoresOrcados = clientesComValor.reduce(
    (acc, c) => acc + (Number(c.valor_orcamento) || Number(c.valor_pago) || 0),
    0,
  );

  const ticketMedioValor = clientesComValor.length > 0 ? somaValoresOrcados / clientesComValor.length : null;

  const ticketMedio: MetricaResultado<number | null> = {
    valor: ticketMedioValor,
    formatado:
      ticketMedioValor !== null
        ? `R$ ${ticketMedioValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "Sem informação suficiente",
    disponivel: ticketMedioValor !== null,
    fonte: "Tabela public.clientes (Apenas cadastros com valor financeiro informado)",
    periodo: descricaoPeriodo,
  };

  // 5. CLIENTES EM RISCO DE CHURN & SEM INFORMAÇÃO
  // Regra: Se ultimo_contato for nulo/ausente, classifica como "Sem informação", NUNCA como "Em risco".
  let contagemEmRisco = 0;
  let contagemSemInformacaoContato = 0;
  const dataReferenciaHoje = new Date();

  clientesFiltrados.forEach((c) => {
    if (!c.ultimo_contato) {
      contagemSemInformacaoContato++;
    } else {
      const dtContato = new Date(c.ultimo_contato + "T00:00:00");
      const diffDias = Math.floor((dataReferenciaHoje.getTime() - dtContato.getTime()) / (1000 * 3600 * 24));
      if (diffDias > 30) {
        contagemEmRisco++;
      }
    }
  });

  // 6. MARGEM DE LUCRO GLOBAL
  const gastosPeriodo = temFiltroData
    ? gastos.filter((g) => estaNoPeriodo(g.data, filtroPeriodo))
    : gastos;

  const totalGastosValor = gastosPeriodo.reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
  const margemBrutaValor = faturamentoReal - totalGastosValor;
  const margemPctValor = faturamentoReal > 0 ? (margemBrutaValor / faturamentoReal) * 100 : null;

  const margemLucro: MetricaResultado<number | null> = {
    valor: margemPctValor,
    formatado: margemPctValor !== null ? `${margemPctValor.toFixed(1)}%` : "Sem informação",
    disponivel: margemPctValor !== null,
    fonte: "Integração Faturamento public.clientes & Gastos public.gastos",
    periodo: descricaoPeriodo,
  };

  return {
    faturamentoReal: {
      valor: faturamentoReal,
      formatado: `R$ ${faturamentoReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      disponivel: true,
      fonte: "Tabela public.clientes (Valores pagos confirmados em Instalados/Finalizados)",
      periodo: descricaoPeriodo,
    } as MetricaResultado<number>,

    orcamentosPendentes,
    taxaConversao,
    ticketMedio,
    margemLucro,

    clientesEmRisco: {
      valor: contagemEmRisco,
      formatado: `${contagemEmRisco} clientes`,
      disponivel: true,
      fonte: "Tabela public.clientes (ultimo_contato > 30 dias)",
      periodo: descricaoPeriodo,
      observacao: `${contagemSemInformacaoContato} clientes sem informação de último contato.`,
    } as MetricaResultado<number>,

    clientesSemInformacaoContato: contagemSemInformacaoContato,
    totalClientesBase: totalBase,
    convertidosQtd: convertidos,
    totalGastos: totalGastosValor,
  };
}
