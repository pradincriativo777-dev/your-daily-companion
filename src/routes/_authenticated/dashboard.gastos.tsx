import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  ConfirmDelete,
  EmptyState,
  KpiCard,
  Loading,
  PageHeader,
  Pagination,
} from "@/components/crm/ui";
import { FilterSelect } from "./dashboard.clientes.index";
import { GastoDialog } from "@/components/crm/GastoInteracaoDialogs";
import {
  CATEGORIAS_GASTO,
  TIPOS_GASTO,
  exportCSV,
  formatCurrency,
  formatDate,
  num,
} from "@/lib/crm";
import {
  useClientes,
  useGastos,
  useRemove,
  useTecnicos,
  type Gasto,
} from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/gastos")({
  head: () => ({
    meta: [
      { title: "Gastos e Despesas · JANSOL Admin" },
      {
        name: "description",
        content: "Controle de gastos por cliente, técnico e categoria.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GastosPage,
});

const PAGE_SIZE = 25;

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function GastosPage() {
  const { data: gastos = [], isLoading } = useGastos();
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const remove = useRemove("gastos");

  const [de, setDe] = useState(firstDayOfMonth());
  const [ate, setAte] = useState(new Date().toISOString().slice(0, 10));
  const [fCategoria, setFCategoria] = useState("todas");
  const [fTipo, setFTipo] = useState("todos");
  const [fCliente, setFCliente] = useState("todos");
  const [fTecnico, setFTecnico] = useState("todos");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);

  const nomeCliente = (id: string | null) =>
    clientes.find((c) => c.id === id)?.nome ?? "—";
  const nomeTecnico = (id: string | null) =>
    tecnicos.find((t) => t.id === id)?.nome ?? "—";

  const filtrados = useMemo(
    () =>
      gastos.filter(
        (g) =>
          g.data >= de &&
          g.data <= ate &&
          (fCategoria === "todas" || g.categoria === fCategoria) &&
          (fTipo === "todos" || g.tipo === fTipo) &&
          (fCliente === "todos" || g.cliente_id === fCliente) &&
          (fTecnico === "todos" || g.tecnico_id === fTecnico),
      ),
    [gastos, de, ate, fCategoria, fTipo, fCliente, fTecnico],
  );

  const totalGasto = filtrados.reduce((s, g) => s + num(g.valor), 0);
  const receita = clientes
    .filter(
      (c) => c.data_instalacao && c.data_instalacao >= de && c.data_instalacao <= ate,
    )
    .reduce((s, c) => s + num(c.valor_pago), 0);
  const lucro = receita - totalGasto;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  const porCategoria = CATEGORIAS_GASTO.map((cat) => ({
    cat,
    total: filtrados
      .filter((g) => g.categoria === cat)
      .reduce((s, g) => s + num(g.valor), 0),
  })).filter((c) => c.total > 0);

  const porTecnico = tecnicos
    .map((t) => ({
      nome: t.nome,
      total: filtrados
        .filter((g) => g.tecnico_id === t.id)
        .reduce((s, g) => s + num(g.valor), 0),
    }))
    .filter((t) => t.total > 0);

  const pageCount = Math.ceil(filtrados.length / PAGE_SIZE);
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Gastos e Despesas"
        description="Controle de custos por cliente, técnico e categoria."
      >
        <Button
          variant="outline"
          onClick={() =>
            exportCSV(
              "gastos.csv",
              filtrados.map((g) => ({
                Data: formatDate(g.data),
                Categoria: g.categoria,
                Descricao: g.descricao,
                Cliente: nomeCliente(g.cliente_id),
                Tecnico: nomeTecnico(g.tecnico_id),
                Tipo: g.tipo,
                Valor: g.valor ?? 0,
              })),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Gasto
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="bg-card" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="bg-card" />
        </div>
        <div className="flex items-end">
          <FilterSelect value={fCategoria} onChange={setFCategoria} all="todas" label="Categoria" options={[...CATEGORIAS_GASTO]} />
        </div>
        <div className="flex items-end">
          <FilterSelect value={fTipo} onChange={setFTipo} all="todos" label="Tipo" options={[...TIPOS_GASTO]} />
        </div>
        <div className="flex items-end">
          <FilterSelect value={fCliente} onChange={setFCliente} all="todos" label="Cliente" options={clientes.map((c) => ({ value: c.id, label: c.nome }))} />
        </div>
        <div className="flex items-end">
          <FilterSelect value={fTecnico} onChange={setFTecnico} all="todos" label="Técnico" options={tecnicos.map((t) => ({ value: t.id, label: t.nome }))} />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Gasto no Período" value={formatCurrency(totalGasto)} tone="danger" />
        <KpiCard label="Receita no Período" value={formatCurrency(receita)} tone="success" />
        <KpiCard label="Lucro no Período" value={formatCurrency(lucro)} tone={lucro >= 0 ? "success" : "danger"} />
        <KpiCard label="Margem %" value={`${margem.toFixed(1)}%`} tone={margem >= 0 ? "success" : "danger"} />
        <Card className="gap-0 py-4">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
              Gasto por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-4 text-sm">
            {porCategoria.length === 0 ? (
              <p className="text-muted-foreground">Sem gastos no período</p>
            ) : (
              porCategoria.map((c) => (
                <div key={c.cat} className="flex justify-between">
                  <span className="text-muted-foreground">{c.cat}</span>
                  <span className="font-medium">{formatCurrency(c.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="gap-0 py-4">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
              Gasto por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-4 text-sm">
            {porTecnico.length === 0 ? (
              <p className="text-muted-foreground">Sem gastos por técnico</p>
            ) : (
              porTecnico.map((t) => (
                <div key={t.nome} className="flex justify-between">
                  <span className="text-muted-foreground">{t.nome}</span>
                  <span className="font-medium">{formatCurrency(t.total)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden py-0">
        {filtrados.length === 0 ? (
          <EmptyState title="Nenhum gasto no período" description="Ajuste o período ou registre um novo gasto." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>{formatDate(g.data)}</TableCell>
                      <TableCell>{g.categoria}</TableCell>
                      <TableCell>{g.descricao}</TableCell>
                      <TableCell>{nomeCliente(g.cliente_id)}</TableCell>
                      <TableCell>{nomeTecnico(g.tecnico_id)}</TableCell>
                      <TableCell>{g.tipo}</TableCell>
                      <TableCell className="text-right">{formatCurrency(g.valor)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(g);
                              setDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDelete
                            onConfirm={() => remove.mutate(g.id)}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={filtrados.length} onPage={setPage} />
          </>
        )}
      </Card>

      <GastoDialog open={dialog} onOpenChange={setDialog} gasto={editing} />
    </div>
  );
}
