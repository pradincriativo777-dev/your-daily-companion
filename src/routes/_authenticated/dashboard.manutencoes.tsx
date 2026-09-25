import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  Loading,
  PageHeader,
  Pagination,
  StatusBadge,
} from "@/components/crm/ui";
import { FilterSelect } from "./dashboard.clientes.index";
import { ManutencaoDialog } from "@/components/crm/TecnicoManutencaoDialogs";
import {
  STATUS_MANUTENCAO,
  TIPOS_MANUTENCAO,
  exportCSV,
  formatCurrency,
  formatDate,
} from "@/lib/crm";
import {
  useClientes,
  useManutencoes,
  useRemove,
  useTecnicos,
  type Manutencao,
} from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/manutencoes")({
  head: () => ({
    meta: [
      { title: "Manutenções · JANSOL Admin" },
      {
        name: "description",
        content: "Agenda e histórico de manutenções dos sistemas de aquecimento solar.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ManutencoesPage,
});

const PAGE_SIZE = 25;

function ManutencoesPage() {
  const { data: manutencoes = [], isLoading } = useManutencoes();
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const remove = useRemove("manutencoes");

  const [busca, setBusca] = useState("");
  const [fTipo, setFTipo] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [fTecnico, setFTecnico] = useState("todos");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Manutencao | null>(null);

  const nomeCliente = (id: string) =>
    clientes.find((c) => c.id === id)?.nome ?? "—";
  const nomeTecnico = (id: string | null) =>
    tecnicos.find((t) => t.id === id)?.nome ?? "—";

  const isRegistroDemonstrativo = (m: Manutencao) => {
    const desc = String(m.descricao || "").toLowerCase();
    const taskRef = String(m.auvo_task_id || "").toLowerCase();
    const obs = String(m.observacoes || "").toLowerCase();
    const idStr = String(m.id || "").toLowerCase();

    const termosDemonstrativos = [
      "auvo-task-881201",
      "auvo-task-881202",
      "881201",
      "881202",
      "manutenção preventiva em coletor solar",
      "manutencao preventiva em coletor solar",
      "vistoria técnica para orçamento de boiler",
      "vistoria tecnica para orcamento de boiler",
      "coletor solar",
      "orcamento de boiler",
      "orçamento de boiler",
      "8812",
    ];

    return (
      Boolean((m as any).is_test) ||
      termosDemonstrativos.some(
        (t) =>
          desc.includes(t) ||
          taskRef.includes(t) ||
          obs.includes(t) ||
          idStr.includes(t)
      )
    );
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();

    // Exclusão visual explícita e temporária de registros demonstrativos existentes no banco
    const reais = manutencoes.filter((m) => !isRegistroDemonstrativo(m));

    return reais.filter(
      (m) =>
        (!q ||
          nomeCliente(m.cliente_id).toLowerCase().includes(q) ||
          nomeTecnico(m.tecnico_id).toLowerCase().includes(q)) &&
        (fTipo === "todos" || m.tipo === fTipo) &&
        (fStatus === "todos" || m.status === fStatus) &&
        (fTecnico === "todos" || m.tecnico_id === fTecnico),
    );
  }, [manutencoes, clientes, tecnicos, busca, fTipo, fStatus, fTecnico]);

  const pageCount = Math.ceil(filtrados.length / PAGE_SIZE);
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Manutenções"
        description={`${filtrados.length} manutenção(ões) listada(s)`}
      >
        <Button
          variant="outline"
          onClick={() =>
            exportCSV(
              "manutencoes.csv",
              filtrados.map((m) => ({
                Cliente: nomeCliente(m.cliente_id),
                Data: formatDate(m.data_manutencao),
                Tipo: m.tipo,
                Descricao: m.descricao ?? "",
                Tecnico: nomeTecnico(m.tecnico_id),
                Status: m.status,
                "Proxima Manutencao": formatDate(m.proxima_manutencao),
                Custo: m.custo ?? 0,
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
          <Plus className="mr-1.5 h-4 w-4" /> Nova Manutenção
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por cliente ou técnico"
          className="bg-card"
        />
        <FilterSelect value={fTipo} onChange={setFTipo} all="todos" label="Tipo" options={[...TIPOS_MANUTENCAO]} />
        <FilterSelect value={fStatus} onChange={setFStatus} all="todos" label="Status" options={[...STATUS_MANUTENCAO]} />
        <FilterSelect
          value={fTecnico}
          onChange={setFTecnico}
          all="todos"
          label="Técnico"
          options={tecnicos.map((t) => ({ value: t.id, label: t.nome }))}
        />
      </div>

      <Card className="border-0 shadow-none overflow-hidden bg-transparent">
        {filtrados.length === 0 ? (
          <EmptyState
            title="Nenhuma manutenção encontrada"
            description="Agende a primeira manutenção para começar."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8F6F1] text-xs border-b border-[#E2DDD0]">
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Próxima</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((m) => (
                    <TableRow key={m.id} className="hover:bg-[#FAF5E8]/60 cursor-pointer text-xs border-b border-[#E2DDD0]">
                      <TableCell>
                        <Link
                          to="/dashboard/clientes/$id"
                          params={{ id: m.cliente_id }}
                          className="font-medium hover:text-accent"
                        >
                          {nomeCliente(m.cliente_id)}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(m.data_manutencao)}</TableCell>
                      <TableCell>{m.tipo}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {m.descricao ?? "—"}
                      </TableCell>
                      <TableCell>{nomeTecnico(m.tecnico_id)}</TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} kind="manutencao" />
                      </TableCell>
                      <TableCell>{formatDate(m.proxima_manutencao)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.custo)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(m);
                              setDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDelete
                            onConfirm={() => remove.mutate(m.id)}
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
            <Pagination
              page={page}
              pageCount={pageCount}
              total={filtrados.length}
              onPage={setPage}
            />
          </>
        )}
      </Card>

      <ManutencaoDialog
        open={dialog}
        onOpenChange={setDialog}
        manutencao={editing}
      />
    </div>
  );
}
