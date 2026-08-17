import { createFileRoute, Link } from "@tanstack/react-router";
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
import { AlertTriangle, CalendarClock, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, KpiCard, Loading, StatusBadge } from "@/components/crm/ui";
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
  type Cliente,
} from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard · JANSOL Admin" },
      { name: "description", content: "Visão geral de vendas, manutenções e faturamento da JANSOL." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardHome,
});

const STATUS_COLORS: Record<string, string> = {
  "Orçamento": "#F97316",
  Aprovado: "#EAB308",
  Instalado: "#22C55E",
  "Em Manutenção": "#EAB308",
  Finalizado: "#0D0D0D",
};

import { calcularMetricasOficiais } from "@/lib/metricas";

function DashboardHome() {
  const { data: clientes = [], isLoading } = useClientes();
  const { data: manutencoes = [] } = useManutencoes();
  const { data: gastos = [] } = useGastos();

  if (isLoading) return <Loading />;

  // Métricas Oficiais Centralizadas
  const metricas = calcularMetricasOficiais({ clientes, manutencoes, gastos });

  const faturamentoRealFormatado = metricas.faturamentoReal.formatado;
  const orcamentosPendentesTexto = metricas.orcamentosPendentes.formatado;
  const taxaConversao = metricas.taxaConversao.valor ?? 0;
  const ticketMedioFormatado = metricas.ticketMedio.formatado;
  const emRiscoCount = metricas.clientesEmRisco.valor;

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-primary">
        Dashboard
      </h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Faturamento Real (Confirmado)"
          value={faturamentoRealFormatado}
          tone="success"
          hint="Todo o histórico acumulado"
        />
        <KpiCard
          label="Orçamentos Pendentes"
          value={orcamentosPendentesTexto}
          tone="pending"
          hint="Aguardando Conta Azul"
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          hint="Convertidos / Total Clientes"
        />
        <KpiCard
          label="Ticket Médio"
          value={ticketMedioFormatado}
        />
        <KpiCard
          label="Clientes em Risco"
          value={emRiscoCount}
          tone="danger"
          hint="Sem contato há mais de 30 dias"
        />
        <KpiCard
          label="Próximas Manutenções"
          value={proximasManutencoes.length}
          tone="warning"
          hint="Nos próximos 7 dias"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas e Lembretes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {emRiscoClientes.slice(0, 5).map((c: Cliente) => (
            <Link
              key={c.id}
              to="/dashboard/clientes/$id"
              params={{ id: c.id }}
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm hover:bg-destructive/15"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>
                Cliente <strong>{c.nome}</strong> sem contato há{" "}
                {daysSince(c.ultimo_contato) ?? "muitos"} dias
              </span>
            </Link>
          ))}
          {proximasManutencoes.slice(0, 5).map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm"
            >
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>
                Manutenção de <strong>{nomeCliente(m.cliente_id)}</strong> vence
                em {daysUntil(m.proxima_manutencao)} dias
              </span>
            </div>
          ))}
          {orcamentosParados.slice(0, 5).map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-2 rounded-md border border-pending/50 bg-pending/10 px-3 py-2 text-sm"
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-pending" />
              <span>
                Orçamento de <strong>{c.nome}</strong> enviado há{" "}
                {daysSince(c.created_at.slice(0, 10))} dias sem resposta
              </span>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-md border border-info/50 bg-info/10 px-3 py-2 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span>
              <strong>{instalacoesSemana}</strong> instalações agendadas esta
              semana
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos Cadastros</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {ultimos.length === 0 ? (
            <EmptyState
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente na página Clientes."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        to="/dashboard/clientes/$id"
                        params={{ id: c.id }}
                        className="font-medium hover:text-accent"
                      >
                        {c.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{c.cidade ?? "—"}</TableCell>
                    <TableCell>{c.tipo_sistema}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>{formatDate(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Faturamento Mensal (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="receita" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {porStatus.length === 0 ? (
              <EmptyState title="Sem dados" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
