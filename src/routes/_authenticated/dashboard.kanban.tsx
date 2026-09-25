import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
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
import { DemoFunnelModal } from "@/components/crm/DemoFunnelModal";
import { STATUS_CLIENTE, TIPOS_SISTEMA, formatCurrency } from "@/lib/crm";
import {
  useClientes,
  useTecnicos,
  useUpdateStatusCliente,
  type Cliente,
} from "@/hooks/use-crm";
import { cn } from "@/lib/utils";
import { fetchKanbanCardsServer } from "@/lib/kanban.server";

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
  "Orçamento": "bg-[#F2EFE8] text-[#706D65] border-b border-[#E2DDD0]",
  Aprovado: "bg-[#FAF5E8] text-[#C8794A] border-b border-[#F2D7A5]",
  Instalado: "bg-[#EAF3EA] text-[#2F6B2F] border-b border-[#C2DEC2]",
  "Em Manutenção": "bg-[#FAF5E8] text-[#C8794A] border-b border-[#F2D7A5]",
  Finalizado: "bg-[#EAF3EA] text-[#2F6B2F] border-b border-[#C2DEC2]",
};

function KanbanPage() {
  const navigate = useNavigate();
  const { data: tecnicos = [] } = useTecnicos();
  const updateStatus = useUpdateStatusCliente();
  const [dialog, setDialog] = useState(false);
  const [demoModal, setDemoModal] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [fCidade, setFCidade] = useState("todas");
  const [fTecnico, setFTecnico] = useState("todos");
  const [fSistema, setFSistema] = useState("todos");

  const [colunasState, setColunasState] = useState<Record<string, { cards: Cliente[]; total: number; page: number; hasMore: boolean }>>({});
  const [loadingKanban, setLoadingKanban] = useState(true);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const carregarColuna = async (status: string, pageNum = 1) => {
    try {
      const res = await (fetchKanbanCardsServer as any)({
        data: {
          status,
          page: pageNum,
          limit: 50,
          cidade: fCidade,
          tecnicoId: fTecnico,
          tipoSistema: fSistema,
        },
      });

      setColunasState((prev) => {
        const cartoesAntigos = pageNum > 1 ? prev[status]?.cards || [] : [];
        const map = new Map<string, Cliente>();
        [...cartoesAntigos, ...res.cards].forEach((c: any) => map.set(c.id, c));

        return {
          ...prev,
          [status]: {
            cards: Array.from(map.values()),
            total: res.totalCount,
            page: pageNum,
            hasMore: res.hasMore,
          },
        };
      });
    } catch (err) {
      console.error(`Erro ao carregar coluna ${status}:`, err);
    }
  };

  useEffect(() => {
    setLoadingKanban(true);
    Promise.all(STATUS_CLIENTE.map((status) => carregarColuna(status, 1))).finally(() =>
      setLoadingKanban(false),
    );
  }, [fCidade, fTecnico, fSistema]);

  const drop = (status: string) => {
    if (!dragId || atualizandoId === dragId) return;
    const clienteId = dragId;
    setDragId(null);
    setAtualizandoId(clienteId);
    updateStatus.mutate(
      { id: clienteId, status },
      {
        onSettled: () => {
          setAtualizandoId(null);
          Promise.all(STATUS_CLIENTE.map((s) => carregarColuna(s, 1)));
        },
      },
    );
  };

  if (loadingKanban) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Kanban de Vendas"
        description="Pipeline visual de vendas e instalações da JANSOL."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setDemoModal(true)}
            className="border-[#E3B94F]/40 bg-[#E3B94F]/10 text-[#E3B94F] hover:bg-[#E3B94F]/20 hover:text-[#E3B94F] text-xs font-semibold"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Clientes para Testar Funil
          </Button>
          <Button
            onClick={() => setDialog(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={fCidade} onValueChange={setFCidade}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as cidades</SelectItem>
            {["Resende", "Itatiaia", "Porto Real", "Barra Mansa", "Volta Redonda"].map((c: string) => (
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
          const colData = colunasState[status] || { cards: [], total: 0, page: 1, hasMore: false };
          const cardsExibidos = colData.cards;
          const possuiMais = colData.hasMore;

          return (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(status)}
              className="flex min-h-64 flex-col rounded-lg border border-[#E2DDD0] bg-[#F8F6F1]"
            >
              <div
                className={cn(
                  "flex items-center justify-between rounded-t-lg px-3 py-2 text-sm font-semibold",
                  COLUMN_STYLE[status],
                )}
              >
                <span>{status}</span>
                <span className="rounded-full bg-black/15 px-2 text-xs" title="Carregados do total no servidor">
                  {cardsExibidos.length} de {colData.total}
                </span>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {cardsExibidos.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    onClick={() =>
                      navigate({
                        to: "/dashboard/clientes/$id",
                        params: { id: c.id },
                      })
                    }
                    className={cn(
                      "cursor-grab rounded-md border border-[#E2DDD0] bg-white p-3 text-sm shadow-sm transition hover:border-[#C8794A] hover:shadow-md active:cursor-grabbing",
                      dragId === c.id && "opacity-40",
                      atualizandoId === c.id && "pointer-events-none opacity-50 animate-pulse",
                    )}
                  >
                    <p className="font-semibold text-[#100D3F]">{c.nome}</p>
                    <p className="text-xs text-[#706D65]">{c.cidade || "—"}</p>
                    {c.valor_orcamento !== undefined && (
                      <p className="mt-2 text-xs font-bold text-[#1D1C19]">
                        {formatCurrency(c.valor_orcamento)}
                      </p>
                    )}
                  </div>
                ))}

                {cardsExibidos.length === 0 && !loadingKanban && (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Nenhum cliente
                  </p>
                )}

                {possuiMais && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-primary font-semibold border border-dashed mt-2"
                    onClick={() => carregarColuna(status, colData.page + 1)}
                  >
                    Carregar mais (+50)
                  </Button>
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

      <DemoFunnelModal
        open={demoModal}
        onOpenChange={setDemoModal}
        onDataChanged={() => {
          Promise.all(STATUS_CLIENTE.map((status) => carregarColuna(status, 1)));
        }}
      />
    </div>
  );
}
