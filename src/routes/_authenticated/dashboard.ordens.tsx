import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useClientes,
  useTecnicos,
  useGastos,
  useInteracoes,
  useManutencoes,
  useOrdensServico,
  OrdemServico,
} from "@/hooks/use-crm";
import {
  ORDENS_STATUS_LIST,
  OrdemStatus,
  formatCurrency,
  calcularFinanceiroOS,
  validarCancelamentoOrdem,
} from "@/lib/ordens-servico";
import { OrdensKanbanView } from "@/components/crm/OrdensKanbanView";
import { OrdemServicoDialog } from "@/components/crm/OrdemServicoDialog";
import { OrdemServicoDetalhesDialog } from "@/components/crm/OrdemServicoDetalhesDialog";
import { PacoteTecnicoModal } from "@/components/crm/PacoteTecnicoModal";
import { OrdensFinanceiroDashboard } from "@/components/crm/OrdensFinanceiroDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Kanban,
  List,
  DollarSign,
  Calendar,
  User,
  Filter,
  Eye,
  Clock,
  Wrench,
  AlertTriangle,
  RefreshCw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/ordens")({
  component: OrdensPage,
});

function OrdensPage() {
  const { data: ordens = [], refetch: refetchOrdens, isLoading } = useOrdensServico();
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const { data: gastos = [], refetch: refetchGastos } = useGastos();
  const { data: interacoes = [] } = useInteracoes();
  const { data: manutencoes = [] } = useManutencoes();

  // Estados de Controle de UI
  const [viewMode, setViewMode] = useState<"lista" | "kanban" | "financeiro">("lista");
  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState<string>("all");
  const [filtroTecnico, setFiltroTecnico] = useState<string>("all");
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("all");

  // Modais
  const [dialogCriarOpen, setDialogCriarOpen] = useState(false);
  const [ordemParaEditar, setOrdemParaEditar] = useState<OrdemServico | null>(null);

  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);

  const [modalPacoteOpen, setModalPacoteOpen] = useState(false);
  const [ordemParaPacote, setOrdemParaPacote] = useState<OrdemServico | null>(null);

  const clienteMap = new Map(clientes.map((c) => [c.id, c.nome]));
  const tecnicoMap = new Map(tecnicos.map((t) => [t.id, t.nome]));

  // Filtros aplicados
  const ordensFiltradas = ordens.filter((o) => {
    const nomeCliente = clienteMap.get(o.cliente_id) || "";
    const nomeTecnico = o.tecnico_id ? tecnicoMap.get(o.tecnico_id) || "" : "";
    const term = busca.toLowerCase();

    const matchBusca =
      !busca ||
      o.codigo.toLowerCase().includes(term) ||
      nomeCliente.toLowerCase().includes(term) ||
      nomeTecnico.toLowerCase().includes(term) ||
      o.descricao_problema.toLowerCase().includes(term) ||
      o.endereco_visita.toLowerCase().includes(term);

    const matchCliente = filtroCliente === "all" || o.cliente_id === filtroCliente;
    const matchTecnico = filtroTecnico === "all" || o.tecnico_id === filtroTecnico;
    const matchStatus = filtroStatus === "all" || o.status === filtroStatus;
    const matchPrioridade = filtroPrioridade === "all" || o.prioridade === filtroPrioridade;

    return matchBusca && matchCliente && matchTecnico && matchStatus && matchPrioridade;
  });

  const handleSalvarOrdem = async (dados: Partial<OrdemServico>) => {
    try {
      if (dados.id) {
        // Atualização com verificação de concorrência (Optimistic Lock)
        const { data: currentDb } = await (supabase.from as any)("ordens_servico")
          .select("version")
          .eq("id", dados.id)
          .single();

        if (currentDb && currentDb.version !== dados.version) {
          throw new Error(
            "Esta Ordem de Serviço foi alterada por outro usuário. Recarregue os dados antes de salvar.",
          );
        }

        const newVersion = (dados.version || 1) + 1;
        const { error } = await (supabase.from as any)("ordens_servico")
          .update({ ...dados, version: newVersion, updated_at: new Date().toISOString() } as any)
          .eq("id", dados.id);

        if (error) throw error;
        toast.success("Ordem de Serviço atualizada com sucesso!");
      } else {
        // Criação de nova Ordem
        const { error } = await (supabase.from as any)("ordens_servico").insert({
          ...dados,
          sync_status: "pendente",
        } as any);

        if (error) throw error;
        toast.success("Ordem de Serviço criada com sucesso!");
      }

      refetchOrdens();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar Ordem de Serviço.");
      throw err;
    }
  };

  const handleUpdateStatus = async (
    ordem: OrdemServico,
    novoStatus: OrdemStatus,
    motivoCancelamento?: string,
  ) => {
    const validacao = validarCancelamentoOrdem(novoStatus, motivoCancelamento);
    if (!validacao.valido) {
      toast.error(validacao.erro);
      return;
    }

    try {
      const { error } = await (supabase.from as any)("ordens_servico")
        .update({
          status: novoStatus,
          motivo_cancelamento: motivoCancelamento || ordem.motivo_cancelamento,
          version: ordem.version + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", ordem.id);

      if (error) throw error;

      // Registrar Auditoria
      await (supabase.from as any)("ordens_servico_auditoria").insert({
        ordem_id: ordem.id,
        acao: novoStatus === "Cancelada" ? "CANCELAMENTO" : "MUDANCA_STATUS",
        status_anterior: ordem.status,
        status_novo: novoStatus,
        motivo_cancelamento: motivoCancelamento || null,
      } as any);

      toast.success(`Status da ${ordem.codigo} alterado para "${novoStatus}"`);
      refetchOrdens();

      if (ordemSelecionada && ordemSelecionada.id === ordem.id) {
        setOrdemSelecionada({
          ...ordemSelecionada,
          status: novoStatus,
          motivo_cancelamento: motivoCancelamento || ordem.motivo_cancelamento,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status.");
    }
  };

  const handleUpdateFinanceiro = async (
    ordem: OrdemServico,
    finData: {
      valor_orcado: number;
      valor_aprovado: number;
      valor_recebido: number;
      situacao_pagamento: string;
    },
  ) => {
    try {
      const { error } = await (supabase.from as any)("ordens_servico")
        .update({
          ...finData,
          version: ordem.version + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", ordem.id);

      if (error) throw error;

      // Log de Auditoria Financeira
      await (supabase.from as any)("ordens_servico_auditoria").insert({
        ordem_id: ordem.id,
        acao: "ATUALIZACAO_FINANCEIRA",
        detalhes: finData,
      } as any);

      refetchOrdens();

      if (ordemSelecionada && ordemSelecionada.id === ordem.id) {
        setOrdemSelecionada({
          ...ordemSelecionada,
          ...finData,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar financeiro.");
      throw err;
    }
  };

  return (
    <div className="space-y-6 p-1 md:p-4">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Central de Ordens de Serviço
          </h1>
          <p className="text-xs text-slate-500">
            Gerencie atendimentos, visões em Lista e Kanban e resultado financeiro consolidado.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Modos de Exibição */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Button
              variant={viewMode === "lista" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("lista")}
            >
              <List className="h-3.5 w-3.5 mr-1" /> Lista
            </Button>
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("kanban")}
            >
              <Kanban className="h-3.5 w-3.5 mr-1" /> Kanban
            </Button>
            <Button
              variant={viewMode === "financeiro" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("financeiro")}
            >
              <DollarSign className="h-3.5 w-3.5 mr-1" /> Financeiro
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setOrdemParaEditar(null);
              setDialogCriarOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nova Ordem
          </Button>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border">
        {/* Busca por Texto */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por código, cliente, técnico ou endereço..."
            className="pl-9 h-9 text-xs"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* Filtro Cliente */}
        <div>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Técnico */}
        <div>
          <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os técnicos</SelectItem>
              {tecnicos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Status */}
        <div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {ORDENS_STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (LISTA / KANBAN / FINANCEIRO) */}
      {viewMode === "kanban" ? (
        <OrdensKanbanView
          ordens={ordensFiltradas}
          clientes={clientes}
          tecnicos={tecnicos}
          onSelectOrdem={(ordem) => {
            setOrdemSelecionada(ordem);
            setDialogDetalhesOpen(true);
          }}
          onUpdateStatus={handleUpdateStatus}
          onCancelarOrdem={(ordem) => {
            setOrdemSelecionada(ordem);
            setDialogDetalhesOpen(true);
          }}
        />
      ) : viewMode === "financeiro" ? (
        <OrdensFinanceiroDashboard
          ordens={ordensFiltradas}
          gastos={gastos}
          clientes={clientes}
          tecnicos={tecnicos}
        />
      ) : (
        /* VISUALIZAÇÃO EM LISTA (TABELA) */
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-xs">
                  <TableHead className="w-28 font-bold">Código</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Técnico</TableHead>
                  <TableHead className="font-bold">Data Prevista</TableHead>
                  <TableHead className="font-bold">Status OS</TableHead>
                  <TableHead className="font-bold">Integração AUVO</TableHead>
                  <TableHead className="font-bold text-right">Valor Aprovado</TableHead>
                  <TableHead className="w-20 text-center font-bold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordensFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                      Nenhuma Ordem de Serviço encontrada com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  ordensFiltradas.map((ordem) => {
                    const nomeCliente = clienteMap.get(ordem.cliente_id) || "Cliente não informado";
                    const nomeTecnico = ordem.tecnico_id
                      ? tecnicoMap.get(ordem.tecnico_id) || "Sem técnico"
                      : "Sem técnico";

                    return (
                      <TableRow
                        key={ordem.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer text-xs"
                        onClick={() => {
                          setOrdemSelecionada(ordem);
                          setDialogDetalhesOpen(true);
                        }}
                      >
                        <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {ordem.codigo}
                        </TableCell>

                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {nomeCliente}
                        </TableCell>

                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {nomeTecnico}
                        </TableCell>

                        <TableCell className="text-slate-600 dark:text-slate-400">
                          {new Date(ordem.data_prevista + "T00:00:00").toLocaleDateString(
                            "pt-BR",
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="font-medium text-[11px]">
                            {ordem.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                            <Clock className="h-3 w-3" /> Integração pendente
                          </span>
                        </TableCell>

                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(ordem.valor_aprovado)}
                        </TableCell>

                        <TableCell className="text-center flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-semibold text-[#100D3F] hover:bg-[#FAF5E8] gap-1"
                            title="Gerar pacote do técnico em PDF"
                            onClick={() => {
                              setOrdemParaPacote(ordem);
                              setModalPacoteOpen(true);
                            }}
                          >
                            <FileText className="h-3.5 w-3.5 text-[#E2B321]" />
                            Pacote
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setOrdemSelecionada(ordem);
                              setDialogDetalhesOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DIÁLOGOS E MODAIS */}
      <OrdemServicoDialog
        open={dialogCriarOpen}
        onOpenChange={setDialogCriarOpen}
        clientes={clientes}
        tecnicos={tecnicos}
        ordemParaEditar={ordemParaEditar}
        onSave={handleSalvarOrdem}
      />

      <OrdemServicoDetalhesDialog
        open={dialogDetalhesOpen}
        onOpenChange={setDialogDetalhesOpen}
        ordem={ordemSelecionada}
        cliente={ordemSelecionada ? clientes.find((c) => c.id === ordemSelecionada.cliente_id) : null}
        tecnico={ordemSelecionada && ordemSelecionada.tecnico_id ? tecnicos.find((t) => t.id === ordemSelecionada.tecnico_id) : null}
        gastosOS={ordemSelecionada ? gastos.filter((g) => g.ordem_servico_id === ordemSelecionada.id) : []}
        interacoesOS={ordemSelecionada ? interacoes.filter((i) => i.ordem_servico_id === ordemSelecionada.id) : []}
        manutencoesOS={ordemSelecionada ? manutencoes.filter((m) => m.ordem_servico_id === ordemSelecionada.id) : []}
        onRefreshData={() => {
          refetchOrdens();
          refetchGastos();
        }}
        onUpdateStatus={handleUpdateStatus}
        onUpdateFinanceiro={handleUpdateFinanceiro}
      />
      {/* Modal do Pacote do Técnico */}
      <PacoteTecnicoModal
        open={modalPacoteOpen}
        onOpenChange={setModalPacoteOpen}
        ordemServico={
          ordemParaPacote
            ? {
                ...ordemParaPacote,
                cliente_nome: clienteMap.get(ordemParaPacote.cliente_id),
                cliente_telefone: (clientes.find((c) => c.id === ordemParaPacote.cliente_id) as any)?.telefone || clientes.find((c) => c.id === ordemParaPacote.cliente_id)?.whatsapp,
                tecnico_nome: ordemParaPacote.tecnico_id ? tecnicoMap.get(ordemParaPacote.tecnico_id) : undefined,
              }
            : null
        }
      />
    </div>
  );
}
