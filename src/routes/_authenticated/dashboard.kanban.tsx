import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loading, PageHeader } from "@/components/crm/ui";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { STATUS_CLIENTE, TIPOS_SISTEMA, formatCurrency } from "@/lib/crm";
import {
  useClientes,
  useTecnicos,
  useUpdateStatusCliente,
  type Cliente,
} from "@/hooks/use-crm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban de Vendas · JANSOL Admin" },
      {
        name: "description",
        content: "Pipeline visual de vendas e instalações da JANSOL.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: KanbanPage,
});

const COLUMN_STYLE: Record<string, string> = {
  "Orçamento": "bg-pending text-pending-foreground",
  Aprovado: "bg-warning text-warning-foreground",
  Instalado: "bg-success text-success-foreground",
  "Em Manutenção": "bg-warning text-warning-foreground",
  Finalizado: "bg-success text-success-foreground",
};

function KanbanPage() {
  const navigate = useNavigate();
  const { data: clientes = [], isLoading } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const updateStatus = useUpdateStatusCliente();
  const [dialog, setDialog] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [fCidade, setFCidade] = useState("todas");
  const [fTecnico, setFTecnico] = useState("todos");
  const [fSistema, setFSistema] = useState("todos");

  const [limitePorColuna, setLimitePorColuna] = useState<Record<string, number>>({});
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  // 1. Deduplicação Estrita por ID do Cliente
  const clientesDeduplicados = useMemo(() => {
    const map = new Map<string, Cliente>();
    for (const c of clientes) {
      if (c && c.id && !map.has(c.id)) {
        map.set(c.id, c);
      }
    }
    return Array.from(map.values());
  }, [clientes]);

  const cidades = Array.from(
    new Set(clientesDeduplicados.map((c: Cliente) => c.cidade).filter(Boolean) as string[]),
  ).sort();

  const filtrados = clientesDeduplicados.filter(
    (c: Cliente) =>
      (fCidade === "todas" || c.cidade === fCidade) &&
      (fTecnico === "todos" || c.tecnico_id === fTecnico) &&
      (fSistema === "todos" || c.tipo_sistema === fSistema),
  );

  const nomeTecnico = (id: string | null) =>
    tecnicos.find((t) => t.id === id)?.nome ?? null;

  const drop = (status: string) => {
    if (!dragId || atualizandoId === dragId) return;
    const cliente = clientesDeduplicados.find((c) => c.id === dragId);
    setDragId(null);
    if (!cliente || cliente.status === status) return;
    setAtualizandoId(cliente.id);
    updateStatus.mutate(
      { id: cliente.id, status },
      {
        onSettled: () => setAtualizandoId(null),
      },
    );
  };

  const getLimite = (status: string) => limitePorColuna[status] || 50;

  const carregarMais = (status: string) => {
    setLimitePorColuna((prev) => ({
      ...prev,
      [status]: (prev[status] || 50) + 50,
    }));
  };

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Kanban de Vendas"
        description="Pipeline visual de vendas e instalações da JANSOL."
      >
        <Button
          onClick={() => setDialog(true)}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Cliente
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={fCidade} onValueChange={setFCidade}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as cidades</SelectItem>
            {cidades.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fTecnico} onValueChange={setFTecnico}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Técnico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os técnicos</SelectItem>
            {tecnicos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fSistema} onValueChange={setFSistema}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Sistema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os sistemas</SelectItem>
            {TIPOS_SISTEMA.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATUS_CLIENTE.map((status) => {
          const todosCardsColuna = filtrados.filter((c: Cliente) => c.status === status);
          const limiteAtual = getLimite(status);
          const cardsExibidos = todosCardsColuna.slice(0, limiteAtual);
          const possuiMais = todosCardsColuna.length > cardsExibidos.length;

          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(status)}
              className="flex min-h-64 flex-col rounded-lg border bg-card"
            >
              <div
                className={cn(
                  "flex items-center justify-between rounded-t-lg px-3 py-2 text-sm font-semibold",
                  COLUMN_STYLE[status],
                )}
              >
                <span>{status}</span>
                <span className="rounded-full bg-black/15 px-2 text-xs" title="Carregados de Total">
                  {cardsExibidos.length} de {todosCardsColuna.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {cardsExibidos.map((c: Cliente) => (
                  <button
                    key={c.id}
                    type="button"
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onClick={() =>
                      navigate({
                        to: "/dashboard/clientes/$id",
                        params: { id: c.id },
                      })
                    }
                    className={cn(
                      "w-full cursor-grab rounded-md border bg-background p-2.5 text-left text-sm shadow-sm transition hover:border-accent active:cursor-grabbing",
                      atualizandoId === c.id && "opacity-50 pointer-events-none",
                    )}
                  >
                    <p className="font-semibold text-primary">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.cidade ?? "—"} · {c.tipo_sistema}
                    </p>
                    <p className="mt-1 text-xs font-medium text-accent">
                      {formatCurrency(c.valor_orcamento)}
                    </p>
                    {nomeTecnico(c.tecnico_id) && (
                      <p className="text-xs text-muted-foreground">
                        Téc.: {nomeTecnico(c.tecnico_id)}
                      </p>
                    )}
                  </button>
                ))}

                {possuiMais && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => carregarMais(status)}
                    className="w-full text-xs text-slate-600 mt-2"
                  >
                    Carregar mais (+50)
                  </Button>
                )}

                {todosCardsColuna.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum cliente
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ClienteDialog
        open={dialog}
        onOpenChange={setDialog}
        defaultStatus="Orçamento"
      />
    </div>
  );
}
