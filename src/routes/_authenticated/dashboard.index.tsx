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
  Plug,
  Activity,
  MoreHorizontal,
  Sparkles,
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { DemoFunnelModal } from "@/components/crm/DemoFunnelModal";
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
      { title: "Dashboard Executivo · JANSOL OS" },
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
  const routeContext = Route.useRouteContext();
  const user = routeContext?.user;
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();
  const { data: manutencoes = [], isLoading: loadingManutencoes } = useManutencoes();
  const { data: gastos = [] } = useGastos();
  const { data: tecnicos = [] } = useTecnicos();

  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [ordemModalOpen, setOrdemModalOpen] = useState(false);
  const [visitaModalOpen, setVisitaModalOpen] = useState(false);

  if (loadingClientes || loadingManutencoes) return <Loading label="Carregando JANSOL OS..." />;

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
    if (!c.created_at) return false;
    const d = daysSince(String(c.created_at).slice(0, 10));
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
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* 1. HIERARQUIA PASSO 1: Saudação Compacta (Altura <= 140px, Sem ruído) */}
      <div className="rounded-2xl bg-[#1D1C19] p-4 sm:p-5 text-[#F8F6F1] border border-[#2B2924] flex flex-col justify-between max-h-[140px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <JansolSunIcon className="h-4 w-4" />
            <span className="text-xs font-bold text-[#E3B94F]">JANSOL OS</span>
          </div>
          <span className="text-[11px] text-[#99958C] capitalize">{dataFormatadaHoje}</span>
        </div>

        <div className="my-1 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-serif-editorial text-xl sm:text-2xl font-bold tracking-tight text-[#F8F6F1]">
              Bom dia, <span className="not-italic text-[#E3B94F]">{userName}</span>
            </h1>
            <p className="text-xs text-[#DDD8CE]">
              Operação planejada. Atendimento próximo. <strong className="text-[#F8F6F1] font-semibold">{clientes.length} clientes ativos</strong> na base.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-[#DDD8CE] bg-[#292722] px-3 py-1.5 rounded-lg border border-[#38352F]">
            <Activity className="h-3.5 w-3.5 text-[#E3B94F]" />
            <span>{emRiscoClientes.length} cliente(s) em risco de contato</span>
          </div>
        </div>
      </div>

      {clientes.length === 0 && (
        <div className="rounded-2xl border border-[#E3B94F]/40 bg-[#E3B94F]/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#F8F6F1] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E3B94F]/20 text-[#E3B94F] border border-[#E3B94F]/30 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#E3B94F]">Base de Clientes Vazia para Teste</p>
              <p className="text-xs text-[#DDD8CE]">Deseja popular o sistema com 19 clientes de teste completos para simular o funil de vendas, relatórios e ordens de serviço?</p>
            </div>
          </div>
          <Button
            onClick={() => setDemoModalOpen(true)}
            className="jansol-gradient-btn text-xs font-bold text-[#1D1C19] shadow-md shrink-0 px-4 h-10"
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Gerar 19 Clientes de Teste
          </Button>
        </div>
      )}

      {/* 2. HIERARQUIA PASSO 2: Principais 4 Indicadores na Primeira Linha */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#706D65]">
            Indicadores Prioritários
          </h2>
          <span className="text-[11px] font-medium text-[#8E8C82]">Base Oficial Centralizada</span>
        </div>

        {/* 4 Indicadores Principais na Primeira Linha */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Faturamento Real"
            value={faturamentoRealFormatado}
            tone="success"
            hint="Histórico acumulado"
            fonte="Tabela public.clientes (valor_pago)"
            onClick={() => navigate({ to: "/dashboard/relatorios" })}
            tooltip="Clique para ver relatórios detalhados"
          />
          <MetricCard
            label="Taxa de Conversão"
            value={taxaConversaoFormatada}
            tone="default"
            hint="Aprovados / Total (819)"
            fonte="Fórmula Oficial Global JANSOL"
            onClick={() => navigate({ to: "/dashboard/clientes" })}
            tooltip="Clique para ver o funil de vendas"
          />
          <MetricCard
            label="Ticket Médio"
            value={ticketMedioFormatado}
            tone="default"
            hint="Média por faturamento"
            fonte="Média de orçamentos pagos"
            onClick={() => navigate({ to: "/dashboard/relatorios" })}
            tooltip="Clique para ver detalhamento do ticket médio"
          />
          <MetricCard
            label="Orçamentos Pendentes"
            value={orcamentosPendentesTexto}
            tone="pending"
            hint="Aguardando Conta Azul"
            fonte="Módulo Financeiro Oficial"
            tooltip="Métrica oficial aguardando integração com Conta Azul / Módulo de Orçamentos."
          />
        </div>

        {/* Indicadores Secundários (2 Linha Mais Discreta) */}
        <div className="grid gap-4 sm:grid-cols-2 pt-1">
          <MetricCard
            label="Clientes em Risco"
            value={emRiscoCount}
            tone="danger"
            hint="Sem contato há +30 dias"
            fonte="Data de último contato"
            onClick={() => navigate({ to: "/dashboard/clientes" })}
            tooltip="Clique para ver clientes sem contato recente"
          />
          <MetricCard
            label="Próximas Manutenções"
            value={proximasManutencoes.length}
            tone="warning"
            hint="Preventivas nos próximos 7 dias"
            fonte="Agenda de Preventivas"
            onClick={() => navigate({ to: "/dashboard/agenda" })}
            tooltip="Clique para abrir a agenda de manutenções"
          />
        </div>
      </section>

      {/* 3. HIERARQUIA PASSO 3: Área "Precisa da Sua Atenção" (Lista Unificada Limpa sem Cards Aninhados) */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-[#E2DDD0]/80 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#24231F]">
              Precisa da Sua Atenção
            </h2>
            <p className="text-xs text-[#706D65]">Pendências operacionais reais aguardando ação imediata</p>
          </div>
          <span className="text-xs font-semibold text-[#C8794A]">
            {emRiscoClientes.length + proximasManutencoes.length + orcamentosParados.length} itens requerem ação
          </span>
        </div>

        {emRiscoClientes.length === 0 && proximasManutencoes.length === 0 && orcamentosParados.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#706D65]">
            Nenhuma pendência crítica ou alerta ativo no momento.
          </div>
        ) : (
          <div className="divide-y divide-[#E2DDD0]/60">
            {emRiscoClientes.slice(0, 3).map((c: Cliente) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#C53030]" />
                    <span className="text-xs font-bold text-[#24231F] truncate">Cliente {c.nome} em risco de contato</span>
                  </div>
                  <p className="text-[11px] text-[#706D65] pl-4">
                    Última interação há {daysSince(c.ultimo_contato) ?? "mais de 30"} dias · {c.cidade ?? "Sem cidade"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/dashboard/clientes/$id", params: { id: c.id } })}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1D1C19] hover:text-[#C8794A] shrink-0"
                >
                  <span>Abrir Ficha</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}

            {proximasManutencoes.slice(0, 3).map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#D97706]" />
                    <span className="text-xs font-bold text-[#24231F] truncate">Manutenção Preventiva: {nomeCliente(m.cliente_id)}</span>
                  </div>
                  <p className="text-[11px] text-[#706D65] pl-4">
                    Vencimento em {daysUntil(m.proxima_manutencao)} dias ({formatDate(m.proxima_manutencao)})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/dashboard/agenda" })}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1D1C19] hover:text-[#C8794A] shrink-0"
                >
                  <span>Ver Agenda</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. HIERARQUIA PASSO 4: Ações Rápidas em Linha Horizontal Compacta */}
      <section className="pt-6 pb-2 flex flex-wrap items-center justify-between gap-3 border-y border-[#E2DDD0]/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#24231F]">Ações Rápidas:</span>
          <span className="text-xs text-[#706D65]">Atalhos para fluxos diretos</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOrdemModalOpen(true)}
            className="jansol-gradient-btn flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Nova OS</span>
          </button>

          <button
            type="button"
            onClick={() => setVisitaModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-[#E2DDD0] bg-[#F8F6F1] py-1.5 px-3 text-xs font-semibold text-[#24231F] hover:bg-[#FAF5E8]"
          >
            <Calendar className="h-3.5 w-3.5 text-[#C8794A]" />
            <span>Agendar Visita</span>
          </button>

          <button
            type="button"
            onClick={() => setClienteModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-[#E2DDD0] bg-[#F8F6F1] py-1.5 px-3 text-xs font-semibold text-[#24231F] hover:bg-[#FAF5E8]"
          >
            <UserPlus className="h-3.5 w-3.5 text-[#E3B94F]" />
            <span>Novo Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard/tarefas" })}
            className="flex items-center gap-1.5 rounded-md border border-[#E2DDD0] bg-[#F8F6F1] py-1.5 px-3 text-xs font-semibold text-[#24231F] hover:bg-[#FAF5E8]"
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-700" />
            <span>Nova Tarefa</span>
          </button>

          {/* Menu "Mais Ações" */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border border-[#E2DDD0] bg-[#F8F6F1] py-1.5 px-2.5 text-xs font-medium text-[#706D65] hover:text-[#24231F]"
              >
                <span>Mais Ações</span>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border border-[#E2DDD0] bg-white p-1">
              <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/manutencoes" })} className="text-xs font-medium py-2">
                Nova Manutenção
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/gastos" })} className="text-xs font-medium py-2">
                Novo Gasto / Despesa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/dashboard/interacoes" })} className="text-xs font-medium py-2">
                Nova Interação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* 5. HIERARQUIA PASSO 5: Atividade Recente (Tabela de Últimos Clientes) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#706D65]">
            Últimos Clientes Cadastrados
          </h2>
          <Link
            to="/dashboard/clientes"
            className="flex items-center gap-1 text-xs font-bold text-[#1D1C19] hover:text-[#C8794A]"
          >
            Ver todos os {clientes.length} clientes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden">
          {ultimos.length === 0 ? (
            <EmptyState
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente para iniciar."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F6F1] sticky top-0 z-10">
                  <TableRow className="border-b border-[#E2DDD0]">
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
                    <TableRow key={c.id} className="hover:bg-[#FAF5E8]/60 transition-colors border-b border-[#E2DDD0]">
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
                          className="inline-flex items-center gap-1 rounded-md border border-[#E2DDD0] bg-[#F8F6F1] px-2.5 py-1 text-xs font-bold text-[#1D1C19] hover:bg-[#FAF5E8]"
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
      <DemoFunnelModal
        open={demoModalOpen}
        onOpenChange={setDemoModalOpen}
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
