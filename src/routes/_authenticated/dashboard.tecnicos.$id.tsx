import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  KpiCard,
  Loading,
  StatusBadge,
} from "@/components/crm/ui";
import { formatCurrency, formatDate, num } from "@/lib/crm";
import {
  useClientes,
  useGastos,
  useManutencoes,
  useTecnicos,
} from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/tecnicos/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do Técnico · JANSOL Admin" },
      {
        name: "description",
        content: "Clientes, manutenções, gastos e resultado financeiro do técnico.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TecnicoDetalhe,
});

function TecnicoDetalhe() {
  const { id } = Route.useParams();
  const { data: tecnicos = [], isLoading } = useTecnicos();
  const { data: clientes = [] } = useClientes();
  const { data: manutencoes = [] } = useManutencoes();
  const { data: gastos = [] } = useGastos();

  if (isLoading) return <Loading />;
  const tecnico = tecnicos.find((t) => t.id === id);
  if (!tecnico) return <EmptyState title="Técnico não encontrado" />;

  const meusClientes = clientes.filter((c) => c.tecnico_id === id);
  const minhasManutencoes = manutencoes.filter((m) => m.tecnico_id === id);
  const meusGastos = gastos.filter((g) => g.tecnico_id === id);

  const receita =
    meusClientes.reduce((s, c) => s + num(c.valor_pago), 0) +
    minhasManutencoes
      .filter((m) => m.status === "Concluída")
      .reduce((s, m) => s + num(m.custo), 0);
  const custo =
    num(tecnico.custo_mensal) + meusGastos.reduce((s, g) => s + num(g.valor), 0);
  const lucro = receita - custo;
  const roi = custo > 0 ? (lucro / custo) * 100 : 0;

  const nomeCliente = (cid: string) =>
    clientes.find((c) => c.id === cid)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link to="/dashboard/tecnicos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary">{tecnico.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {tecnico.especialidade} · {tecnico.status} ·{" "}
            {tecnico.telefone ?? "sem telefone"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Custo Mensal"
          value={formatCurrency(tecnico.custo_mensal)}
          tone="danger"
        />
        <KpiCard
          label="Receita Gerada"
          value={formatCurrency(receita)}
          tone="success"
        />
        <KpiCard
          label="Lucro"
          value={formatCurrency(lucro)}
          tone={lucro >= 0 ? "success" : "danger"}
        />
        <KpiCard
          label="ROI"
          value={`${roi.toFixed(1)}%`}
          tone={roi >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="pt-4">
          <CardTitle className="text-base">Clientes Atribuídos</CardTitle>
        </CardHeader>
        {meusClientes.length === 0 ? (
          <EmptyState title="Nenhum cliente atribuído" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meusClientes.map((c) => (
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
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(c.valor_pago)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden py-0">
        <CardHeader className="pt-4">
          <CardTitle className="text-base">Manutenções Realizadas</CardTitle>
        </CardHeader>
        {minhasManutencoes.length === 0 ? (
          <EmptyState title="Nenhuma manutenção registrada" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {minhasManutencoes.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{nomeCliente(m.cliente_id)}</TableCell>
                    <TableCell>{formatDate(m.data_manutencao)}</TableCell>
                    <TableCell>{m.tipo}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} kind="manutencao" />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(m.custo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden py-0">
        <CardHeader className="pt-4">
          <CardTitle className="text-base">Gastos Vinculados</CardTitle>
        </CardHeader>
        {meusGastos.length === 0 ? (
          <EmptyState title="Nenhum gasto vinculado" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meusGastos.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{formatDate(g.data)}</TableCell>
                    <TableCell>{g.categoria}</TableCell>
                    <TableCell>{g.descricao}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(g.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <CardContent className="hidden" />
    </div>
  );
}
