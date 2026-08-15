import { OrdemServico, Cliente, Tecnico, Gasto } from "@/hooks/use-crm";
import { calcularFinanceiroOS, formatCurrency, formatPercent } from "@/lib/ordens-servico";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  User,
  Users,
  DollarSign,
  Info,
  Calendar,
} from "lucide-react";

interface OrdensFinanceiroDashboardProps {
  ordens: OrdemServico[];
  gastos: Gasto[];
  clientes: Cliente[];
  tecnicos: Tecnico[];
}

export function OrdensFinanceiroDashboard({
  ordens,
  gastos,
  clientes,
  tecnicos,
}: OrdensFinanceiroDashboardProps) {
  const clienteMap = new Map(clientes.map((c) => [c.id, c.nome]));
  const tecnicoMap = new Map(tecnicos.map((t) => [t.id, t.nome]));

  // Agrupamento de Gastos por Ordem
  const gastosPorOrdem = new Map<string, Gasto[]>();
  for (const g of gastos) {
    if (g.ordem_servico_id) {
      const arr = gastosPorOrdem.get(g.ordem_servico_id) || [];
      arr.push(g);
      gastosPorOrdem.set(g.ordem_servico_id, arr);
    }
  }

  // Cálculos consolidados das Ordens
  const ordensCalculadas = ordens.map((ordem) => {
    const listGastos = gastosPorOrdem.get(ordem.id) || [];
    const fin = calcularFinanceiroOS({
      valorOrcado: ordem.valor_orcado || 0,
      valorAprovado: ordem.valor_aprovado || 0,
      valorRecebido: ordem.valor_recebido || 0,
      gastos: listGastos.map((g) => ({ categoria: g.categoria, valor: g.valor })),
    });
    return {
      ordem,
      fin,
      clienteNome: clienteMap.get(ordem.cliente_id) || "Cliente não informado",
      tecnicoNome: ordem.tecnico_id ? tecnicoMap.get(ordem.tecnico_id) || "Sem técnico" : "Sem técnico",
    };
  });

  // Totais Gerais
  const totalRecebido = ordensCalculadas.reduce((acc, item) => acc + item.fin.valorRecebido, 0);
  const totalCusto = ordensCalculadas.reduce((acc, item) => acc + item.fin.custoTotal, 0);
  const resultadoBrutoTotal = totalRecebido - totalCusto;
  const valorPendenteTotal = ordensCalculadas.reduce(
    (acc, item) => acc + Math.max(0, item.fin.valorAprovado - item.fin.valorRecebido),
    0,
  );

  // Ordens com prejuízo
  const ordensPrejuizo = ordensCalculadas.filter((item) => item.fin.resultadoBruto < 0);

  // Agrupamento de Gastos por Cliente
  const gastosPorClienteMap = new Map<string, number>();
  for (const g of gastos) {
    if (g.cliente_id) {
      const current = gastosPorClienteMap.get(g.cliente_id) || 0;
      gastosPorClienteMap.set(g.cliente_id, current + (g.valor || 0));
    }
  }
  const listaGastosCliente = Array.from(gastosPorClienteMap.entries())
    .map(([clienteId, total]) => ({
      clienteNome: clienteMap.get(clienteId) || "Cliente",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // Agrupamento de Gastos por Técnico
  const gastosPorTecnicoMap = new Map<string, number>();
  for (const g of gastos) {
    if (g.tecnico_id) {
      const current = gastosPorTecnicoMap.get(g.tecnico_id) || 0;
      gastosPorTecnicoMap.set(g.tecnico_id, current + (g.valor || 0));
    }
  }
  const listaGastosTecnico = Array.from(gastosPorTecnicoMap.entries())
    .map(([tecnicoId, total]) => ({
      tecnicoNome: tecnicoMap.get(tecnicoId) || "Técnico",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const temDadosSuficientes = ordensCalculadas.length > 0 || gastos.length > 0;

  if (!temDadosSuficientes) {
    return (
      <Card className="bg-slate-50 dark:bg-slate-900 border-dashed">
        <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-2">
          <Info className="h-8 w-8 text-slate-400" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">
            Dados suficientes não encontrados
          </h3>
          <p className="text-xs text-slate-500 max-w-md">
            Ainda não existem dados financeiros ou ordens de serviço suficientes para calcular os indicadores do período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Cards de Resumo Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Total Recebido</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalRecebido)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Custo Total de Operações</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalCusto)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Resultado Bruto Consolidado</span>
              <span
                className={`text-xl font-bold ${
                  resultadoBrutoTotal >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(resultadoBrutoTotal)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Valores Pendentes de Recebimento</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(valorPendenteTotal)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Seções de Análise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Ordens com Prejuízo */}
        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" /> Ordens com Prejuízo ({ordensPrejuizo.length})
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Ordens onde o Custo Total superou o Valor Recebido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ordensPrejuizo.length === 0 ? (
              <div className="text-xs text-center py-6 text-slate-400 border border-dashed rounded-md">
                Nenhuma ordem apresentou prejuízo no período.
              </div>
            ) : (
              ordensPrejuizo.map(({ ordem, fin, clienteNome }) => (
                <div
                  key={ordem.id}
                  className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      {ordem.codigo} - {clienteNome}
                    </span>
                    <span className="text-slate-500">
                      Recebido: {formatCurrency(fin.valorRecebido)} | Custo: {formatCurrency(fin.custoTotal)}
                    </span>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {formatCurrency(fin.resultadoBruto)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 2. Gastos por Cliente */}
        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> Gastos por Cliente
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidado de custos operacionais por cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {listaGastosCliente.length === 0 ? (
              <div className="text-xs text-center py-6 text-slate-400 border border-dashed rounded-md">
                Sem registros de gastos por cliente.
              </div>
            ) : (
              listaGastosCliente.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-lg flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {item.clienteNome}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 3. Gastos por Técnico */}
        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" /> Gastos por Técnico
            </CardTitle>
            <CardDescription className="text-xs">
              Custos de execução associados a cada responsável técnico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {listaGastosTecnico.length === 0 ? (
              <div className="text-xs text-center py-6 text-slate-400 border border-dashed rounded-md">
                Sem registros de gastos por técnico.
              </div>
            ) : (
              listaGastosTecnico.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-lg flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {item.tecnicoNome}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 4. Resultado Financeiro por Ordem */}
        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" /> Resultado por Ordem (Top Recentes)
            </CardTitle>
            <CardDescription className="text-xs">
              Demonstração do Resultado Bruto unitário por Ordem de Serviço.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ordensCalculadas.length === 0 ? (
              <div className="text-xs text-center py-6 text-slate-400 border border-dashed rounded-md">
                Nenhuma ordem registrada.
              </div>
            ) : (
              ordensCalculadas.slice(0, 5).map(({ ordem, fin, clienteNome }) => (
                <div
                  key={ordem.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      {ordem.codigo} • {clienteNome}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Aprovado: {formatCurrency(fin.valorAprovado)} | Custo: {formatCurrency(fin.custoTotal)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold block ${
                        fin.resultadoBruto >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatCurrency(fin.resultadoBruto)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Margem: {fin.margemPercentual !== null ? formatPercent(fin.margemPercentual) : "-"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
