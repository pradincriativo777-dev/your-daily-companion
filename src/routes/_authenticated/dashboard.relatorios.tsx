import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard, Loading, PageHeader } from "@/components/crm/ui";
import {
  MARCAS,
  STATUS_CLIENTE,
  TIPOS_SISTEMA,
  exportCSV,
  formatCurrency,
  num,
} from "@/lib/crm";
import {
  useClientes,
  useGastos,
  useManutencoes,
  useTecnicos,
} from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · JANSOL Admin" },
      {
        name: "description",
        content:
          "Relatórios financeiros, operacionais e comerciais da JANSOL aquecimento solar.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RelatoriosPage,
});

const GOLD = "oklch(0.72 0.14 85)";
const PALETTE = [
  GOLD,
  "oklch(0.55 0.13 250)",
  "oklch(0.62 0.16 145)",
  "oklch(0.68 0.17 40)",
  "oklch(0.55 0.18 25)",
  "oklch(0.45 0.05 250)",
];

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

function RelatoriosPage() {
  const { data: clientes = [], isLoading } = useClientes();
  const { data: gastos = [] } = useGastos();
  const { data: manutencoes = [] } = useManutencoes();
  const { data: tecnicos = [] } = useTecnicos();

  const [de, setDe] = useState(startOfYear());
  const [ate, setAte] = useState(new Date().toISOString().slice(0, 10));

  const inRange = (d: string | null) => !!d && d >= de && d <= ate;

  const clientesPeriodo = useMemo(
    () => clientes.filter((c) => inRange(c.data_instalacao)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientes, de, ate],
  );
  const gastosPeriodo = useMemo(
    () => gastos.filter((g) => inRange(g.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gastos, de, ate],
  );
  const manutencoesPeriodo = useMemo(
    () => manutencoes.filter((m) => inRange(m.data_manutencao)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manutencoes, de, ate],
  );

  const receitaInstalacoes = clientesPeriodo.reduce(
    (s, c) => s + num(c.valor_pago),
    0,
  );
  const receitaManutencoes = manutencoesPeriodo
    .filter((m) => m.status === "Concluída")
    .reduce((s, m) => s + num(m.custo), 0);
  const receitaTotal = receitaInstalacoes + receitaManutencoes;
  const custoTotal =
    gastosPeriodo.reduce((s, g) => s + num(g.valor), 0) +
    clientesPeriodo.reduce((s, c) => s + num(c.custo_material), 0);
  const lucro = receitaTotal - custoTotal;
  const margem = receitaTotal > 0 ? (lucro / receitaTotal) * 100 : 0;
  const ticket =
    clientesPeriodo.length > 0 ? receitaInstalacoes / clientesPeriodo.length : 0;

  // Financeiro mensal
  const mensal = useMemo(() => {
    const map = new Map<string, { receita: number; custo: number }>();
    const put = (d: string | null, key: "receita" | "custo", v: number) => {
      if (!d || d < de || d > ate) return;
      const k = d.slice(0, 7);
      const cur = map.get(k) ?? { receita: 0, custo: 0 };
      cur[key] += v;
      map.set(k, cur);
    };
    clientes.forEach((c) => {
      put(c.data_instalacao, "receita", num(c.valor_pago));
      put(c.data_instalacao, "custo", num(c.custo_material));
    });
    manutencoes
      .filter((m) => m.status === "Concluída")
      .forEach((m) => put(m.data_manutencao, "receita", num(m.custo)));
    gastos.forEach((g) => put(g.data, "custo", num(g.valor)));
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => {
        const [y, m] = k.split("-");
        return {
          mes: `${m}/${y?.slice(2)}`,
          receita: v.receita,
          custo: v.custo,
          lucro: v.receita - v.custo,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, gastos, manutencoes, de, ate]);

  // Comercial
  const porStatus = STATUS_CLIENTE.map((s, i) => ({
    name: s,
    value: clientes.filter((c) => c.status === s).length,
    fill: PALETTE[i % PALETTE.length] as string,
  })).filter((s) => s.value > 0);

  const totalClientes = clientes.length;
  const finalizados = clientes.filter((c) => c.status === "Finalizado").length;
  const taxaConversao =
    totalClientes > 0 ? (finalizados / totalClientes) * 100 : 0;

  const porOrigem = useMemo(() => {
    const map = new Map<string, number>();
    clientes.forEach((c) => {
      const k = c.origem ?? "Não informado";
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [clientes]);

  const porCidade = useMemo(() => {
    const map = new Map<string, { qtd: number; receita: number }>();
    clientes.forEach((c) => {
      const k = c.cidade ?? "Não informado";
      const cur = map.get(k) ?? { qtd: 0, receita: 0 };
      cur.qtd += 1;
      cur.receita += num(c.valor_pago);
      map.set(k, cur);
    });
    return [...map.entries()]
      .map(([cidade, v]) => ({ cidade, ...v }))
      .sort((a, b) => b.receita - a.receita);
  }, [clientes]);

  // Operacional
  const porTipoSistema = TIPOS_SISTEMA.map((t, i) => ({
    name: t,
    value: clientes.filter((c) => c.tipo_sistema === t).length,
    fill: PALETTE[i % PALETTE.length] as string,
  })).filter((t) => t.value > 0);

  const porMarca = MARCAS.map((m) => ({
    marca: m,
    qtd: clientes.filter((c) => c.marca === m).length,
  })).filter((m) => m.qtd > 0);

  const produtividade = tecnicos.map((t) => {
    const insts = clientesPeriodo.filter((c) => c.tecnico_id === t.id);
    const mans = manutencoesPeriodo.filter((m) => m.tecnico_id === t.id);
    const rec =
      insts.reduce((s, c) => s + num(c.valor_pago), 0) +
      mans
        .filter((m) => m.status === "Concluída")
        .reduce((s, m) => s + num(m.custo), 0);
    const cus =
      num(t.custo_mensal) +
      gastosPeriodo
        .filter((g) => g.tecnico_id === t.id)
        .reduce((s, g) => s + num(g.valor), 0);
    return {
      nome: t.nome,
      instalacoes: insts.length,
      manutencoes: mans.length,
      receita: rec,
      custo: cus,
      lucro: rec - cus,
    };
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Análises financeiras, comerciais e operacionais."
      >
        <Button
          variant="outline"
          onClick={() =>
            exportCSV(
              "relatorio-mensal.csv",
              mensal.map((m) => ({
                Mes: m.mes,
                Receita: m.receita,
                Custo: m.custo,
                Lucro: m.lucro,
              })),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Exportar Relatório
        </Button>
      </PageHeader>

      <div className="grid gap-2 sm:grid-cols-2 lg:w-1/2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="bg-card" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="bg-card" />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Relatório Financeiro</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Receita Total" value={formatCurrency(receitaTotal)} tone="success" />
          <KpiCard label="Custo Total" value={formatCurrency(custoTotal)} tone="danger" />
          <KpiCard label="Lucro Líquido" value={formatCurrency(lucro)} tone={lucro >= 0 ? "success" : "danger"} />
          <KpiCard label="Margem Média" value={`${margem.toFixed(1)}%`} tone="gold" />
          <KpiCard label="Ticket Médio" value={formatCurrency(ticket)} tone="gold" />
          <KpiCard label="Receita de Manutenções" value={formatCurrency(receitaManutencoes)} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita x Custo x Lucro por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mensal}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke={PALETTE[2]} strokeWidth={2} name="Receita" />
                <Line type="monotone" dataKey="custo" stroke={PALETTE[4]} strokeWidth={2} name="Custo" />
                <Line type="monotone" dataKey="lucro" stroke={GOLD} strokeWidth={2} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Relatório Comercial</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Funil de Vendas · Conversão {taxaConversao.toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porStatus} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" name="Clientes" radius={[0, 4, 4, 0]}>
                    {porStatus.map((s) => (
                      <Cell key={s.name} fill={s.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clientes por Origem</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porOrigem} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {porOrigem.map((o, i) => (
                      <Cell key={o.name} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Card className="overflow-hidden py-0">
          <CardHeader className="pt-4">
            <CardTitle className="text-base">Desempenho por Cidade</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porCidade.map((c) => (
                  <TableRow key={c.cidade}>
                    <TableCell className="font-medium">{c.cidade}</TableCell>
                    <TableCell className="text-right">{c.qtd}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.receita)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-primary">Relatório Operacional</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instalações por Tipo de Sistema</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porTipoSistema} dataKey="value" nameKey="name" outerRadius={95}>
                    {porTipoSistema.map((t) => (
                      <Cell key={t.name} fill={t.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Marcas Mais Vendidas</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMarca}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="marca" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="qtd" name="Instalações" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Card className="overflow-hidden py-0">
          <CardHeader className="pt-4">
            <CardTitle className="text-base">Produtividade por Técnico</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Instalações</TableHead>
                  <TableHead className="text-right">Manutenções</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtividade.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-right">{p.instalacoes}</TableCell>
                    <TableCell className="text-right">{p.manutencoes}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.receita)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.custo)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${p.lucro >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {formatCurrency(p.lucro)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </div>
  );
}
