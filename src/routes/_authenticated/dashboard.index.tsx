import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FileText,
  Calendar,
  UserPlus,
  CheckSquare,
  DollarSign,
  Percent,
  TrendingUp,
  Clock,
  AlertTriangle,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  MetricCard,
  QuickAction,
  AlertItem,
  Loading,
  StatusBadge,
} from "@/components/crm/ui";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { OrdemServicoDialog } from "@/components/crm/OrdemServicoDialog";
import { AgendarVisitaDialog } from "@/components/crm/AgendarVisitaDialog";
import {
  BLACK,
  GOLD,
  STATUS_CLIENTE,
  daysSince,
  daysUntil,
  formatCurrency,
  formatDate,
  num,
} from "@/lib/crm";
import {
  useClientes,
  useGastos,
  useManutencoes,
  useTecnicos,
  type Cliente,
} from "@/hooks/use-crm";
import { calcularMetricasOficiais } from "@/lib/metricas";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo · JANSOL OS" },
      { name: "description", content: "Central de inteligência operacional e financeira JANSOL OS." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardHome,
});

const STATUS_COLORS: Record<string, string> = {
  "Orçamento": "#F97316",
  Aprovado: "#D9A514",
  Instalado: "#2E7D32",
  "Em Manutenção": "#ED6C02",
  Finalizado: "#0B0B0C",
};

function DashboardHome() {
  const navigate = useNavigate();
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();
  const { data: manutencoes = [], isLoading: loadingManutencoes } = useManutencoes();
  const { data: gastos = [] } = useGastos();
  const { data: tecnicos = [] } = useTecnicos();

  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [ordemModalOpen, setOrdemModalOpen] = useState(false);
  const [visitaModalOpen, setVisitaModalOpen] = useState(false);

  if (loadingClientes || loadingManutencoes) return <Loading label="Carregando JANSOL OS..." />;

  const user = Route.useRouteContext().user;
  const userName = user?.email ? user.email.split("@")[0] : "Gestor";

  // Métricas Oficiais Centralizadas (Fórmula Única Global)
  const metricas = calcularMetricasOficiais({ clientes, manutencoes, gastos });

  const faturamentoRealFormatado = metricas.faturamentoReal.formatado;
  const orcamentosPendentesTexto = metricas.orcamentosPendentes.formatado;
  const taxaConversaoFormatada = metricas.taxaConversao.formatado;
  const ticketMedioFormatado = metricas.ticketMedio.formatado;
  const emRiscoCount = metricas.clientesEmRisco.valor;

  // Filtragem de Manutenções Próximas (Sem dados demonstrativos)
  const proximasManutencoes = manutencoes.filter((m) => {
    const desc = String(m.descricao || "").toLowerCase();
    if (desc.includes("coletor solar") || desc.includes("boiler") || desc.includes("8812")) return false;
    const d = daysUntil(m.proxima_manutencao);
    return d !== null && d >= 0 && d <= 7;
  });

  const orcamentosParados = clientes.filter((c) => {
    const d = daysSince(c.created_at.slice(0, 10));
    return c.status === "Orçamento" && d !== null && d > 7;
  });

  const instalacoesSemana = clientes.filter((c) => {
    const d = daysUntil(c.data_instalacao);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const nomeCliente = (id: string) =>
    clientes.find((c) => c.id === id)?.nome ?? "Cliente";

  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();

  const emRiscoClientes = clientes.filter((c: Cliente) => {
    if (c.status === "Finalizado") return false;
    const d = daysSince(c.ultimo_contato);
    return d !== null && d > 30;
  });

  const dataFormatadaHoje = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const meses: Array<{ mes: string; receita: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ano, mes - i, 1);
    const receita = clientes
      .filter((c) => {
        if (!c.data_instalacao) return false;
        const dt = new Date(`${c.data_instalacao}T00:00:00`);
        return (
          dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear()
        );
      })
      .reduce((s, c) => s + num(c.valor_pago), 0);
    meses.push({
      mes: d.toLocaleDateString("pt-BR", { month: "short" }),
      receita,
    });
  }

  const porStatus = STATUS_CLIENTE.map((s) => ({
    name: s,
    value: clientes.filter((c) => c.status === s).length,
  })).filter((s) => s.value > 0);

  const ultimos = [...clientes].slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Saudação e Contexto do Dia */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E7E5DF] bg-white p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0B0B0C]">
              Olá, <span className="capitalize">{userName}</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF3D6] px-3 py-1 text-xs font-semibold text-[#D9A514] border border-[#D9A514]/30">
              <Sparkles className="h-3.5 w-3.5" /> JANSOL OS v2.0
            </span>
          </div>
          <p className="text-sm font-normal text-[#6E6D68] capitalize">
            {dataFormatadaHoje} · Central Executiva de Soluções Térmicas & Solares
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-[#F8F7F3] px-3.5 py-2 text-xs font-semibold text-[#0B0B0C] border border-[#E7E5DF]">
            <Building2 className="h-4 w-4 text-[#D9A514]" />
            <span>{clientes.length} Clientes Cadastrados</span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Ações Rápidas */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E6D68]">
          Ações Rápidas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            label="Nova Ordem de Serviço"
            description="Emitir OS técnica"
            icon={FileText}
            variant="gold"
            onClick={() => setOrdemModalOpen(true)}
          />
          <QuickAction
            label="Agendar Visita"
            description="Visita técnica ou orçamento"
            icon={Calendar}
            onClick={() => setVisitaModalOpen(true)}
          />
          <QuickAction
            label="Novo Cliente"
            description="Cadastrar novo lead"
            icon={UserPlus}
            onClick={() => setClienteModalOpen(true)}
          />
          <QuickAction
            label="Nova Tarefa"
            description="Registrar pendência"
            icon={CheckSquare}
            onClick={() => navigate({ to: "/dashboard/tarefas" })}
          />
        </div>
      </section>

      {/* 3. Indicadores Executivos (KPI Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E6D68]">
            Indicadores Executivos Oficializados
          </h2>
          <span className="text-xs text-[#8E8D88]">Fonte: Banco Supabase Real</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Faturamento Real"
            value={faturamentoRealFormatado}
            icon={DollarSign}
            tone="success"
            hint="Todo o histórico acumulado"
            fonte="Tabela public.clientes (valor_pago)"
            onClick={() => navigate({ to: "/dashboard/relatorios" })}
            tooltip="Clique para abrir o relatório financeiro detalhado"
          />
          <MetricCard
            label="Taxa de Conversão"
            value={taxaConversaoFormatada}
            icon={Percent}
            tone="default"
            hint="Aprovados / Total Geral (819)"
            fonte="Fórmula Oficial Global JANSOL"
            onClick={() => navigate({ to: "/dashboard/clientes" })}
            tooltip="Clique para ver a listagem de clientes e funil de vendas"
          />
          <MetricCard
            label="Ticket Médio"
            value={ticketMedioFormatado}
            icon={TrendingUp}
            tone="default"
            hint="Calculado por cliente faturado"
            fonte="Média de orçamentos pagos"
            onClick={() => navigate({ to: "/dashboard/relatorios" })}
            tooltip="Clique para ver o detalhamento do ticket médio por período"
          />
          <MetricCard
            label="Orçamentos Pendentes"
            value={orcamentosPendentesTexto}
            icon={Clock}
            tone="pending"
            hint="Aguardando Conta Azul"
            fonte="Módulo Financeiro Oficial"
            tooltip="Métrica oficial aguardando integração com Conta Azul / Módulo de Orçamentos. Status 'Orçamento' do cadastro não representa pendência real."
          />
          <MetricCard
            label="Clientes em Risco"
            value={emRiscoCount}
            icon={AlertTriangle}
            tone="danger"
            hint="Sem contato há mais de 30 dias"
            fonte="Data de último contato"
            onClick={() => navigate({ to: "/dashboard/clientes" })}
            tooltip="Clique para abrir a lista de clientes sem contato recente"
          />
          <MetricCard
            label="Próximas Manutenções"
            value={proximasManutencoes.length}
            icon={CalendarClock}
            tone="warning"
            hint="Vencimento nos próximos 7 dias"
            fonte="Agenda de Preventivas"
            onClick={() => navigate({ to: "/dashboard/agenda" })}
            tooltip="Clique para abrir a agenda de visitas e manutenções preventivas"
          />
        </div>
      </section>

      {/* 4. Alertas e Pendências */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E6D68]">
          Central de Alertas & Prioridades Operacionais
        </h2>
        <div className="jansol-card p-5 space-y-3 bg-white">
          {emRiscoClientes.length === 0 && proximasManutencoes.length === 0 && orcamentosParados.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#6E6D68]">
              Nenhum alerta ou pendência crítica registrada no momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {emRiscoClientes.slice(0, 3).map((c: Cliente) => (
                <AlertItem
                  key={c.id}
                  type="danger"
                  title={`Cliente ${c.nome} sem contato`}
                  subtitle={`Última interação há ${daysSince(c.ultimo_contato) ?? "mais de 30"} dias`}
                  badgeText="Em Risco"
                  actionText="Ver Ficha 360°"
                  onAction={() => navigate({ to: "/dashboard/clientes/$id", params: { id: c.id } })}
                />
              ))}

              {proximasManutencoes.slice(0, 3).map((m) => (
                <AlertItem
                  key={m.id}
                  type="warning"
                  title={`Manutenção de ${nomeCliente(m.cliente_id)}`}
                  subtitle={`Vencimento em ${daysUntil(m.proxima_manutencao)} dias (${formatDate(m.proxima_manutencao)})`}
                  badgeText="Preventiva"
                  actionText="Ver Agenda"
                  onAction={() => navigate({ to: "/dashboard/agenda" })}
                />
              ))}

              {orcamentosParados.slice(0, 3).map((c) => (
                <AlertItem
                  key={c.id}
                  type="info"
                  title={`Orçamento de ${c.nome} sem resposta`}
                  subtitle={`Enviado há ${daysSince(c.created_at.slice(0, 10))} dias`}
                  badgeText="Orçamento"
                  actionText="Acompanhar"
                  onAction={() => navigate({ to: "/dashboard/clientes/$id", params: { id: c.id } })}
                />
              ))}

              {instalacoesSemana > 0 && (
                <AlertItem
                  type="success"
                  title={`${instalacoesSemana} instalações agendadas para esta semana`}
                  subtitle="Acompanhe o cronograma dos técnicos na agenda"
                  badgeText="Instalações"
                  actionText="Abrir Agenda"
                  onAction={() => navigate({ to: "/dashboard/agenda" })}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* 5. Visão Operacional: Gráficos e Últimos Cadastros */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico 1: Faturamento Mensal */}
        <div className="jansol-card p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E5DF]/60 pb-3">
            <h3 className="text-sm font-bold text-[#0B0B0C]">
              Faturamento Mensal (Últimos 6 meses)
            </h3>
            <span className="text-xs text-[#6E6D68]">Receita instalada</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                <XAxis dataKey="mes" fontSize={12} stroke="#6E6D68" />
                <YAxis fontSize={12} stroke="#6E6D68" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="receita" fill="#D9A514" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribuição por Status */}
        <div className="jansol-card p-5 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E5DF]/60 pb-3">
            <h3 className="text-sm font-bold text-[#0B0B0C]">
              Distribuição da Base por Status
            </h3>
            <span className="text-xs text-[#6E6D68]">Funil de Vendas</span>
          </div>
          <div className="h-64">
            {porStatus.length === 0 ? (
              <EmptyState title="Sem dados de status" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {porStatus.map((s) => (
                      <Cell
                        key={s.name}
                        fill={STATUS_COLORS[s.name] ?? BLACK}
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 6. Últimos Clientes Cadastrados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E6D68]">
            Últimos Clientes Cadastrados
          </h2>
          <Link
            to="/dashboard/clientes"
            className="flex items-center gap-1 text-xs font-semibold text-[#D9A514] hover:underline"
          >
            Ver todos os {clientes.length} clientes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="jansol-card overflow-hidden bg-white">
          {ultimos.length === 0 ? (
            <EmptyState
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente para iniciar."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F7F3]">
                  <TableRow>
                    <TableHead className="font-bold text-[#0B0B0C]">Nome do Cliente</TableHead>
                    <TableHead className="font-bold text-[#0B0B0C]">Cidade</TableHead>
                    <TableHead className="font-bold text-[#0B0B0C]">Sistema</TableHead>
                    <TableHead className="font-bold text-[#0B0B0C]">Status</TableHead>
                    <TableHead className="font-bold text-[#0B0B0C]">Data de Cadastro</TableHead>
                    <TableHead className="text-right font-bold text-[#0B0B0C]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimos.map((c) => (
                    <TableRow key={c.id} className="hover:bg-[#FAF3D6]/30 transition-colors">
                      <TableCell>
                        <Link
                          to="/dashboard/clientes/$id"
                          params={{ id: c.id }}
                          className="font-semibold text-[#0B0B0C] hover:text-[#D9A514]"
                        >
                          {c.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[#6E6D68]">{c.cidade ?? "—"}</TableCell>
                      <TableCell className="text-[#6E6D68]">{c.tipo_sistema}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-[#6E6D68]">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/dashboard/clientes/$id"
                          params={{ id: c.id }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7E5DF] bg-white px-2.5 py-1 text-xs font-semibold text-[#0B0B0C] hover:bg-[#FAF3D6]"
                        >
                          Ficha 360°
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {/* Modais de Ações Rápidas */}
      <ClienteDialog
        open={clienteModalOpen}
        onOpenChange={setClienteModalOpen}
      />
      <OrdemServicoDialog
        open={ordemModalOpen}
        onOpenChange={setOrdemModalOpen}
        clientes={clientes}
        tecnicos={tecnicos}
        onSave={async () => {
          navigate({ to: "/dashboard/ordens" });
        }}
      />
      <AgendarVisitaDialog
        open={visitaModalOpen}
        onOpenChange={setVisitaModalOpen}
      />
    </div>
  );
}
