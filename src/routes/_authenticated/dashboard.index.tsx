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
  Plug,
  Sun,
  Activity,
} from "lucide-react";
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
  AlertItem,
  Loading,
  StatusBadge,
} from "@/components/crm/ui";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { OrdemServicoDialog } from "@/components/crm/OrdemServicoDialog";
import { AgendarVisitaDialog } from "@/components/crm/AgendarVisitaDialog";
import {
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
import { JansolSunIcon } from "@/components/layout/JansolLogo";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo Bento · JANSOL OS" },
      { name: "description", content: "Central de inteligência operacional e financeira JANSOL OS." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardHome,
});

const STATUS_COLORS: Record<string, string> = {
  "Orçamento": "#F1D47D",
  Aprovado: "#E3B94F",
  Instalado: "#C8794A",
  "Em Manutenção": "#91623E",
  Finalizado: "#1D1C19",
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

  if (loadingClientes || loadingManutencoes) return <Loading label="Carregando JANSOL OS Editorial..." />;

  const user = Route.useRouteContext().user;
  const userName = user?.email ? user.email.split("@")[0] : "Gestor";

  // Métricas Oficiais Centralizadas (Fórmula Única Global)
  const metricas = calcularMetricasOficiais({ clientes, manutencoes, gastos });

  const faturamentoRealFormatado = metricas.faturamentoReal.formatado;
  const orcamentosPendentesTexto = metricas.orcamentosPendentes.formatado;
  const taxaConversaoFormatada = metricas.taxaConversao.formatado;
  const ticketMedioFormatado = metricas.ticketMedio.formatado;
  const emRiscoCount = metricas.clientesEmRisco.valor;

  // Filtragem de Manutenções Próximas
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
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Bento Grid Header: Card de Abertura Editorial JANSOL */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card Principal Bento (Carvão + Dourado com Saudação em Playfair Display) */}
        <div className="lg:col-span-2 rounded-[18px] bg-gradient-to-br from-[#1D1C19] to-[#11110F] p-6 text-[#F8F6F1] border border-[#2B2924] shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[#E3B94F]/10 blur-3xl pointer-events-none" />
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3B94F]/15 px-3 py-1 text-xs font-bold text-[#E3B94F] border border-[#E3B94F]/30">
                <JansolSunIcon className="h-3.5 w-3.5" /> JANSOL OS
              </span>
              <span className="text-xs text-[#99958C] capitalize">{dataFormatadaHoje}</span>
            </div>

            {/* Título Editorial em Playfair Display */}
            <h1 className="font-serif-editorial text-2xl sm:text-3xl italic font-bold tracking-tight text-[#F8F6F1]">
              Bom dia, <span className="not-italic text-[#E3B94F]">{userName}</span>
            </h1>

            <p className="text-xs sm:text-sm text-[#DDD8CE] max-w-xl font-medium">
              Operação planejada. Atendimento próximo. Base oficial com <strong className="text-[#F8F6F1] font-bold">{clientes.length} clientes cadastrados</strong>.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-[#2B2924] relative z-10">
            <div className="flex items-center gap-2 rounded-full bg-[#292722] px-3.5 py-1.5 text-xs font-medium text-[#F8F6F1]">
              <Activity className="h-3.5 w-3.5 text-[#E3B94F]" />
              <span>Prioridade do dia: Acompanhar {emRiscoClientes.length} cliente(s) em risco de contato</span>
            </div>
          </div>
        </div>

        {/* Card Bento Ações Rápidas JANSOL */}
        <div className="jansol-bento-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#706D65]">
              Criação & Ações Rápidas
            </h2>
            <Sparkles className="h-4 w-4 text-[#E3B94F]" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setOrdemModalOpen(true)}
              className="jansol-gradient-btn flex items-center justify-center gap-1.5 p-3 text-xs font-bold shadow-xs hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Nova OS</span>
            </button>

            <button
              type="button"
              onClick={() => setVisitaModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#DDD8CE] bg-[#F8F6F1] p-3 text-xs font-bold text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E3B94F] transition-all cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-[#C8794A]" />
              <span>Agendar</span>
            </button>

            <button
              type="button"
              onClick={() => setClienteModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#DDD8CE] bg-[#F8F6F1] p-3 text-xs font-bold text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E3B94F] transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4 text-[#E3B94F]" />
              <span>Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard/tarefas" })}
              className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#DDD8CE] bg-[#F8F6F1] p-3 text-xs font-bold text-[#1D1C19] hover:bg-emerald-50 hover:border-emerald-400 transition-all cursor-pointer"
            >
              <CheckSquare className="h-4 w-4 text-emerald-700" />
              <span>Tarefa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bento Grid Métricas Operacionais */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#706D65]">
            Métricas Oficiais Centralizadas
          </h2>
          <span className="text-xs font-medium text-[#706D65]">Fórmula Única Global JANSOL</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Faturamento Real */}
          <MetricCard
            label="Faturamento Real"
            value={faturamentoRealFormatado}
            icon={DollarSign}
            tone="success"
            hint="Histórico acumulado de pagamentos"
            fonte="Tabela public.clientes (valor_pago)"
            onClick={() => navigate({ to: "/dashboard/relatorios" })}
            tooltip="Clique para abrir o relatório financeiro detalhado"
          />
          {/* Taxa de Conversão */}
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
          {/* Ticket Médio */}
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
          {/* Orçamentos Pendentes */}
          <MetricCard
            label="Orçamentos Pendentes"
            value={orcamentosPendentesTexto}
            icon={Clock}
            tone="pending"
            hint="Aguardando Conta Azul"
            fonte="Módulo Financeiro Oficial"
            tooltip="Métrica oficial aguardando integração com Conta Azul / Módulo de Orçamentos. Status 'Orçamento' do cadastro não representa pendência real."
          />
          {/* Clientes em Risco */}
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
          {/* Próximas Manutenções */}
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

      {/* 3. Bento Grid: Alertas & Situação das Integrações */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alertas e Prioridades (Span-2) */}
        <div className="lg:col-span-2 jansol-bento-card p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#706D65]">
              Central de Alertas & Prioridades Operacionais
            </h2>
            <span className="text-xs text-[#706D65] font-semibold">Painel Executivo</span>
          </div>

          {emRiscoClientes.length === 0 && proximasManutencoes.length === 0 && orcamentosParados.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#706D65]">
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
            </div>
          )}
        </div>

        {/* Situação das Integrações Bento Card */}
        <div className="jansol-bento-card p-6 space-y-4 bg-white flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#DDD8CE] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#706D65]">
                Situação das Integrações
              </h3>
              <Plug className="h-4 w-4 text-[#E3B94F]" />
            </div>

            <div className="space-y-3">
              <div className="rounded-[14px] border border-[#DDD8CE] bg-[#F8F6F1] p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D1C19] text-white">
                    <Plug className="h-4 w-4 text-[#E3B94F]" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#24231F]">Integração AUVO</span>
                    <span className="block text-[11px] text-[#706D65]">Agenda Externa</span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-300">
                  Bloqueado/Offline
                </span>
              </div>

              <div className="rounded-[14px] border border-[#DDD8CE] bg-[#F8F6F1] p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-200 text-stone-800">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#24231F]">Conta Azul</span>
                    <span className="block text-[11px] text-[#706D65]">Orçamentos Financeiros</span>
                  </div>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800 border border-blue-300">
                  Planejada
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/dashboard/integracoes"
            className="flex items-center justify-center gap-1.5 w-full rounded-[10px] border border-[#DDD8CE] bg-[#F8F6F1] py-2.5 text-xs font-bold text-[#1D1C19] hover:bg-[#FAF5E8] transition-colors"
          >
            <span>Gerenciar Integrações</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#E3B94F]" />
          </Link>
        </div>
      </div>

      {/* 4. Bento Grid: Gráficos de Faturamento & Funil */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico Faturamento Mensal */}
        <div className="jansol-bento-card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] pb-3">
            <h3 className="text-sm font-bold text-[#24231F]">
              Faturamento Mensal (Últimos 6 meses)
            </h3>
            <span className="text-xs text-[#706D65]">Receita instalada</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2EFE8" />
                <XAxis dataKey="mes" fontSize={12} stroke="#706D65" />
                <YAxis fontSize={12} stroke="#706D65" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="receita" fill="#E3B94F" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Funil por Status */}
        <div className="jansol-bento-card p-6 bg-white space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] pb-3">
            <h3 className="text-sm font-bold text-[#24231F]">
              Distribuição do Funil por Status
            </h3>
            <span className="text-xs text-[#706D65]">Base Ativa</span>
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
                        fill={STATUS_COLORS[s.name] ?? "#1D1C19"}
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

      {/* 5. Bento Grid: Tabela de Últimos Clientes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#706D65]">
            Últimos Clientes Cadastrados
          </h2>
          <Link
            to="/dashboard/clientes"
            className="flex items-center gap-1 text-xs font-bold text-[#C8794A] hover:underline"
          >
            Ver todos os {clientes.length} clientes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="jansol-bento-card overflow-hidden bg-white">
          {ultimos.length === 0 ? (
            <EmptyState
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente para iniciar."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F6F1] sticky top-0 z-10">
                  <TableRow className="border-b border-[#DDD8CE]">
                    <TableHead className="font-bold text-[#24231F]">Nome do Cliente</TableHead>
                    <TableHead className="font-bold text-[#24231F]">Cidade</TableHead>
                    <TableHead className="font-bold text-[#24231F]">Sistema</TableHead>
                    <TableHead className="font-bold text-[#24231F]">Status</TableHead>
                    <TableHead className="font-bold text-[#24231F]">Data de Cadastro</TableHead>
                    <TableHead className="text-right font-bold text-[#24231F]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ultimos.map((c) => (
                    <TableRow key={c.id} className="hover:bg-[#FAF5E8]/60 transition-colors border-b border-[#DDD8CE]">
                      <TableCell>
                        <Link
                          to="/dashboard/clientes/$id"
                          params={{ id: c.id }}
                          className="font-bold text-[#24231F] hover:text-[#C8794A]"
                        >
                          {c.nome}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[#706D65]">{c.cidade ?? "—"}</TableCell>
                      <TableCell className="text-[#706D65]">{c.tipo_sistema}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-[#706D65]">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/dashboard/clientes/$id"
                          params={{ id: c.id }}
                          className="inline-flex items-center gap-1 rounded-[10px] border border-[#DDD8CE] bg-[#F8F6F1] px-3 py-1 text-xs font-bold text-[#1D1C19] hover:bg-[#FAF5E8] transition-colors"
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
