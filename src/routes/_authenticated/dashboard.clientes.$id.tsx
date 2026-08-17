import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Pencil, Plus, Trash2, MessageSquare, ExternalLink } from "lucide-react";
import { iniciarAtendimentoAuvoChat } from "@/lib/auvo-chat-assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  StatusBadge,
} from "@/components/crm/ui";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { ManutencaoDialog } from "@/components/crm/TecnicoManutencaoDialogs";
import { AgendarVisitaDialog } from "@/components/crm/AgendarVisitaDialog";
import {
  GastoDialog,
  InteracaoDialog,
} from "@/components/crm/GastoInteracaoDialogs";
import { AssistenteCorrecaoDialog } from "@/components/crm/AssistenteCorrecaoDialog";
import { formatCurrency, formatDate, num } from "@/lib/crm";
import { supabase } from "@/integrations/supabase/client";
import {
  useClientes,
  useGastos,
  useInteracoes,
  useManutencoes,
  useRemove,
  useTecnicos,
  useEquipamentos,
  useEquipamentoGarantias,
  useEquipamentoPlanosPreventivos,
  useEquipamentoAnexos,
  useOrdensServico,
  Equipamento,
} from "@/hooks/use-crm";
import { EquipamentoDialog } from "@/components/crm/EquipamentoDialog";
import { EquipamentoDetalhesDialog } from "@/components/crm/EquipamentoDetalhesDialog";
import { arquivarCliente, restaurarCliente } from "@/lib/clientes-arquivamento";
import { Archive, RotateCcw, Clock, History, AlertTriangle, ShieldCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/clientes/$id")({
  validateSearch: (search: Record<string, unknown>): { revisao?: boolean } => {
    return {
      revisao: search['revisao'] === true || search['revisao'] === "true",
    };
  },
  head: () => ({
    meta: [
      { title: "Ficha do Cliente · JANSOL Admin" },
      {
        name: "description",
        content: "Detalhes, manutenções, gastos e interações do cliente.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClienteDetalhe,
});

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: clientes = [], isLoading } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const { data: manutencoes = [] } = useManutencoes();
  const { data: gastos = [] } = useGastos();
  const { data: interacoes = [] } = useInteracoes();
  const { data: equipamentos = [], refetch: refetchEquipamentos } = useEquipamentos();
  const { data: garantias = [], refetch: refetchGarantias } = useEquipamentoGarantias();
  const { data: planos = [], refetch: refetchPlanos } = useEquipamentoPlanosPreventivos();
  const { data: anexos = [], refetch: refetchAnexos } = useEquipamentoAnexos();
  const { data: ordensServico = [] } = useOrdensServico();

  const removeCliente = useRemove("clientes");
  const removeManutencao = useRemove("manutencoes");
  const removeGasto = useRemove("gastos");
  const removeInteracao = useRemove("interacoes");

  const [editar, setEditar] = useState(false);
  const [revisao, setRevisao] = useState(search.revisao === true);
  const [agendarVisitaOpen, setAgendarVisitaOpen] = useState(false);
  const [novaManut, setNovaManut] = useState(false);
  const [novoGasto, setNovoGasto] = useState(false);
  const [novaInter, setNovaInter] = useState(false);

  const [novoEquipamentoOpen, setNovoEquipamentoOpen] = useState(false);
  const [equipamentoParaEditar, setEquipamentoParaEditar] = useState<Equipamento | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<Equipamento | null>(null);

// ...
  const [modalArquivarOpen, setModalArquivarOpen] = useState(false);
  const [motivoArquivamentoInput, setMotivoArquivamentoInput] = useState("");
  const [processandoArquivamento, setProcessandoArquivamento] = useState(false);

  if (isLoading) return <Loading />;
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente)
    return (
      <EmptyState
        title="Cliente não encontrado"
        description="Verifique se o cliente existe ou foi arquivado."
      />
    );

  const isArquivado = (cliente as any).arquivado === true;

  const handleArquivar = async () => {
    if (!motivoArquivamentoInput || motivoArquivamentoInput.trim().length < 5) {
      toast.error("Por favor, informe o motivo do arquivamento (mínimo 5 caracteres).");
      return;
    }
    setProcessandoArquivamento(true);
    try {
      await arquivarCliente({
        clienteId: cliente.id,
        motivo: motivoArquivamentoInput,
        usuarioEmail: "admin@jansol.com.br",
      });
      toast.success("Cliente arquivado com sucesso! Dados preservados.");
      setModalArquivarOpen(false);
      navigate({ to: "/dashboard/clientes" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao arquivar cliente.");
    } finally {
      setProcessandoArquivamento(false);
    }
  };

  const handleRestaurar = async () => {
    setProcessandoArquivamento(true);
    try {
      await restaurarCliente({
        clienteId: cliente.id,
        usuarioEmail: "admin@jansol.com.br",
      });
      toast.success("Cliente restaurado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao restaurar cliente.");
    } finally {
      setProcessandoArquivamento(false);
    }
  };

  // Linha do Tempo Consolidada (Sem duplicar registros no banco)
  const eventosLinhaTempo = [
    ...ordensServico
      .filter((os) => os.cliente_id === id)
      .map((os) => ({
        id: `os-${os.id}`,
        data: os.data_prevista || os.created_at,
        tipo: "Ordem de Serviço",
        titulo: `OS ${(os as any).codigo_legivel || os.id}: ${os.tipo_atendimento}`,
        detalhes: os.descricao_problema,
        badge: os.status,
      })),
    ...manutencoes
      .filter((m) => m.cliente_id === id)
      .map((m) => ({
        id: `manut-${m.id}`,
        data: m.data_manutencao || m.created_at,
        tipo: "Manutenção",
        titulo: `Manutenção ${m.tipo}`,
        detalhes: m.observacoes || "Sem observações",
        badge: m.status,
      })),
    ...interacoes
      .filter((i) => i.cliente_id === id)
      .map((i) => ({
        id: `inter-${i.id}`,
        data: i.data_interacao || i.created_at,
        tipo: "Interação",
        titulo: `${i.tipo} por ${i.usuario || "Atendente"}`,
        detalhes: i.descricao,
        badge: "Contato",
      })),
    ...gastos
      .filter((g) => g.cliente_id === id)
      .map((g) => ({
        id: `gasto-${g.id}`,
        data: g.data || g.created_at,
        tipo: "Gasto",
        titulo: `Lançamento: ${g.categoria} (R$ ${g.valor})`,
        detalhes: g.descricao || "Gasto atrelado ao cliente",
        badge: g.tipo,
      })),
    ...equipamentos
      .filter((eq) => eq.cliente_id === id)
      .map((eq) => ({
        id: `eq-${eq.id}`,
        data: eq.data_instalacao || eq.created_at,
        tipo: "Equipamento",
        titulo: `Instalação: ${eq.marca} ${eq.modelo} (${eq.categoria})`,
        detalhes: `Local: ${eq.local_instalacao || "Não informado"}`,
        badge: eq.estado,
      })),
  ].sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

  const tecnico = tecnicos.find((t) => t.id === cliente.tecnico_id);
  const ms = manutencoes.filter((m) => m.cliente_id === id);
  const gs = gastos.filter((g) => g.cliente_id === id);
  const is = interacoes.filter((i) => i.cliente_id === id);

  const totalGastos =
    gs.reduce((s, g) => s + num(g.valor), 0) +
    ms.reduce((s, m) => s + num(m.custo), 0);
  const pago = num(cliente.valor_pago);
  const margem = pago - totalGastos;
  const margemPct = pago > 0 ? (margem / pago) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{cliente.nome}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={cliente.status} />
              <span className="text-sm text-muted-foreground">
                {cliente.cidade ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <Badge variant={(cliente as any).revisao ? "destructive" : "secondary"}>
          {(cliente as any).revisao ? "Pendente" : "Correto"}
        </Badge>
        <div className="flex gap-2">
          {(cliente as any).revisao && (
            <Button
              onClick={() => setRevisao(true)}
              className="bg-info text-info-foreground hover:bg-info/90"
            >
              Revisar Cadastro (Inconsistência)
            </Button>
          )}
          <Button
            onClick={() => {
              iniciarAtendimentoAuvoChat(
                {
                  id: cliente.id,
                  nome: cliente.nome,
                  whatsapp: cliente.whatsapp,
                  telefone: (cliente as any).telefone,
                },
                `/dashboard/clientes/${cliente.id}`,
                {
                  onNoPhone: (c) => {
                    toast.error("Este cliente não possui telefone cadastrado.", {
                      action: {
                        label: "Editar Cadastro",
                        onClick: () => setEditar(true),
                      },
                    });
                  },
                  onSuccess: (tel) => {
                    toast.success(`Telefone copiado (${tel}). Direcionando para o Auvo Chat...`);
                  },
                }
              );
            }}
            variant="outline"
            className="border-[#E2DDD0] bg-white text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E3B94F] font-bold text-xs shadow-2xs"
          >
            <MessageSquare className="mr-1.5 h-4 w-4 text-[#C8794A]" />
            <ExternalLink className="mr-1.5 h-3 w-3 text-[#8E8C82]" />
            Atender no Auvo Chat
          </Button>
          <Button
            onClick={() => setAgendarVisitaOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CalendarClock className="mr-1.5 h-4 w-4" /> Agendar visita
          </Button>
          <Button
            onClick={() => setEditar(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Pencil className="mr-1.5 h-4 w-4" /> Editar
          </Button>
          {isArquivado ? (
            <Button
              onClick={handleRestaurar}
              disabled={processandoArquivamento}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Restaurar Cliente
            </Button>
          ) : (
            <Button
              onClick={() => setModalArquivarOpen(true)}
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              <Archive className="mr-1.5 h-4 w-4" /> Arquivar Cliente
            </Button>
          )}
        </div>
      </div>

      {isArquivado && (
        <Card className="border-amber-500 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">Cliente Arquivado</p>
              <p className="text-xs text-muted-foreground">
                Motivo: {(cliente as any).motivo_arquivamento || "Arquivamento registrado"}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="linha_tempo">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="linha_tempo">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="ordens">Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="agenda">Agenda & Visitas</TabsTrigger>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          <TabsTrigger value="garantias">Garantias</TabsTrigger>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="interacoes">Interações</TabsTrigger>
          <TabsTrigger value="financeiro">Resumo Financeiro</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
        </TabsList>

        <TabsContent value="linha_tempo">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Linha do Tempo Consolidada
            </h3>
            {eventosLinhaTempo.length === 0 ? (
              <EmptyState title="Nenhum evento registrado na linha do tempo." />
            ) : (
              <div className="relative border-l border-border pl-4 space-y-4">
                {eventosLinhaTempo.map((ev) => (
                  <div key={ev.id} className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">{formatDate(ev.data)}</span>
                      <Badge variant="outline" className="text-[10px]">{ev.tipo}</Badge>
                      {ev.badge && <Badge variant="secondary" className="text-[10px]">{ev.badge}</Badge>}
                    </div>
                    <p className="font-semibold text-sm mt-0.5">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground">{ev.detalhes || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ordens">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Ordens de Serviço do Cliente</h3>
            {ordensServico.filter((os) => os.cliente_id === id).length === 0 ? (
              <EmptyState title="Nenhuma ordem de serviço vinculada" />
            ) : (
              <div className="space-y-2">
                {ordensServico.filter((os) => os.cliente_id === id).map((os) => (
                  <div key={os.id} className="flex justify-between items-center p-2 rounded border">
                    <div>
                      <p className="font-semibold text-sm">OS {(os as any).codigo_legivel || os.id}: {os.tipo_atendimento}</p>
                      <p className="text-xs text-muted-foreground">{os.descricao_problema}</p>
                    </div>
                    <Badge variant="outline">{os.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="agenda">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-2">Visitas & Agendamentos Locais</h3>
            <p className="text-xs text-muted-foreground mb-3">Integração externa: <Badge variant="outline">Integração pendente (AUVO offline)</Badge></p>
            <Button size="sm" onClick={() => setAgendarVisitaOpen(true)} className="mb-3">
              <Plus className="mr-1 h-3.5 w-3.5" /> Nova Visita
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="garantias">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Garantias dos Equipamentos</h3>
            {garantias.filter((g: any) => g.cliente_id === id).length === 0 ? (
              <EmptyState title="Nenhuma garantia registrada para este cliente" />
            ) : (
              <p className="text-xs text-muted-foreground">Garantias ativas listadas.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="pendencias">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold text-sm">Pendências & Status das Integrações</h3>
            <div className="p-3 rounded border bg-amber-500/10 border-amber-500/30 text-xs text-amber-700 dark:text-amber-400">
              <strong>Integração AUVO:</strong> Integração pendente (API bloqueada na conta). Agendamentos são mantidos localmente.
            </div>
            <div className="p-3 rounded border bg-blue-500/10 border-blue-500/30 text-xs text-blue-700 dark:text-blue-400">
              <strong>Integração Conta Azul:</strong> Integração pendente (Aguardando módulo financeiro).
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="manutencoes">
          <Card className="overflow-hidden py-0">
            <div className="flex justify-end p-3">
              <Button
                size="sm"
                onClick={() => setNovaManut(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nova Manutenção
              </Button>
            </div>
            {ms.length === 0 ? (
              <EmptyState title="Nenhuma manutenção registrada" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Próxima</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ms.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.data_manutencao)}</TableCell>
                        <TableCell>{m.tipo}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {m.descricao ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={m.status} kind="manutencao" />
                        </TableCell>
                        <TableCell>{formatDate(m.proxima_manutencao)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(m.custo)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ConfirmDelete
                            onConfirm={() => removeManutencao.mutate(m.id)}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="equipamentos">
          <Card className="overflow-hidden py-0">
            <div className="flex justify-between items-center p-3">
              <p className="text-sm font-medium">
                Equipamentos instalados:{" "}
                <span className="font-bold">{equipamentos.filter((e) => e.cliente_id === cliente.id).length}</span>
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEquipamentoParaEditar(null);
                  setNovoEquipamentoOpen(true);
                }}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Novo Equipamento
              </Button>
            </div>
            {equipamentos.filter((e) => e.cliente_id === cliente.id).length === 0 ? (
              <EmptyState title="Nenhum equipamento cadastrado para este cliente" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Equipamento (Marca / Modelo)</TableHead>
                      <TableHead>Nº de Série</TableHead>
                      <TableHead>Instalação</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipamentos
                      .filter((e) => e.cliente_id === cliente.id)
                      .map((eq) => (
                        <TableRow
                          key={eq.id}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          onClick={() => {
                            setEquipamentoSelecionado(eq);
                            setEquipamentoDetalhesOpen(true);
                          }}
                        >
                          <TableCell className="font-mono text-xs uppercase">{eq.categoria}</TableCell>
                          <TableCell className="font-bold">{eq.marca} {eq.modelo}</TableCell>
                          <TableCell className="font-mono text-xs">{eq.numero_serie || "—"}</TableCell>
                          <TableCell>
                            {eq.data_instalacao
                              ? new Date(eq.data_instalacao + "T00:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {eq.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEquipamentoSelecionado(eq);
                                setEquipamentoDetalhesOpen(true);
                              }}
                            >
                              Ver detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="gastos">
          <Card className="overflow-hidden py-0">
            <div className="flex items-center justify-between p-3">
              <p className="text-sm font-medium">
                Total gasto:{" "}
                <span className="text-destructive">
                  {formatCurrency(gs.reduce((s, g) => s + num(g.valor), 0))}
                </span>
              </p>
              <Button
                size="sm"
                onClick={() => setNovoGasto(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Novo Gasto
              </Button>
            </div>
            {gs.length === 0 ? (
              <EmptyState title="Nenhum gasto registrado" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gs.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{formatDate(g.data)}</TableCell>
                        <TableCell>{g.categoria}</TableCell>
                        <TableCell>{g.descricao}</TableCell>
                        <TableCell>{g.tipo}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(g.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ConfirmDelete
                            onConfirm={() => removeGasto.mutate(g.id)}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="interacoes">
          <Card className="py-0">
            <div className="flex justify-end p-3">
              <Button
                size="sm"
                onClick={() => setNovaInter(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nova Interação
              </Button>
            </div>
            {is.length === 0 ? (
              <EmptyState title="Nenhuma interação registrada" />
            ) : (
              <ol className="space-y-3 p-4 pt-0">
                {is.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-md border-l-2 border-accent bg-muted/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {formatDate(i.data_interacao)} · {i.tipo}
                      </p>
                      <ConfirmDelete
                        onConfirm={() => removeInteracao.mutate(i.id)}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                    <p className="text-sm">{i.descricao}</p>
                    {i.proximo_passo && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Próximo passo: {i.proximo_passo}
                        {i.data_proximo_contato
                          ? ` · em ${formatDate(i.data_proximo_contato)}`
                          : ""}
                      </p>
                    )}
                    {i.usuario && (
                      <p className="text-xs text-muted-foreground">
                        por {i.usuario}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Valor Orçado"
              value={formatCurrency(cliente.valor_orcamento)}
            />
            <KpiCard
              label="Valor Pago"
              value={formatCurrency(cliente.valor_pago)}
              tone="success"
            />
            <KpiCard
              label="Total Gasto"
              value={formatCurrency(totalGastos)}
              tone="danger"
              hint="Gastos + manutenções"
            />
            <KpiCard
              label="Margem de Lucro"
              value={formatCurrency(margem)}
              tone={margem >= 0 ? "success" : "danger"}
            />
            <KpiCard
              label="Margem %"
              value={`${margemPct.toFixed(1)}%`}
              tone={margemPct >= 0 ? "success" : "danger"}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ClienteDialog open={editar} onOpenChange={setEditar} cliente={cliente} />
      <ManutencaoDialog
        open={novaManut}
        onOpenChange={setNovaManut}
        clienteId={cliente.id}
      />
      <GastoDialog
        open={novoGasto}
        onOpenChange={setNovoGasto}
        clienteId={cliente.id}
      />
      <InteracaoDialog
        open={novaInter}
        onOpenChange={setNovaInter}
        clienteId={cliente.id}
      />
      <EquipamentoDialog
        open={novoEquipamentoOpen}
        onOpenChange={setNovoEquipamentoOpen}
        clientes={clientes}
        ordensServico={ordensServico}
        equipamentosExistentes={equipamentos}
        equipamentoParaEditar={equipamentoParaEditar}
        clienteIdPreDefinido={cliente.id}
        onSave={async (dados) => {
          if (dados.id) {
            await (supabase.from as any)("equipamentos")
              .update({ ...dados, updated_at: new Date().toISOString() })
              .eq("id", dados.id);
          } else {
            await (supabase.from as any)("equipamentos").insert(dados);
          }
          refetchEquipamentos();
        }}
      />
      <EquipamentoDetalhesDialog
        open={equipamentoDetalhesOpen}
        onOpenChange={setEquipamentoDetalhesOpen}
        equipamento={equipamentoSelecionado}
        cliente={cliente}
        garantias={garantias}
        planosPreventivos={planos}
        anexos={anexos}
        ordensServico={ordensServico}
        onRefreshData={() => {
          refetchEquipamentos();
          refetchGarantias();
          refetchPlanos();
          refetchAnexos();
        }}
        onEditarEquipamento={(eq) => {
          setEquipamentoParaEditar(eq);
          setNovoEquipamentoOpen(true);
        }}
      />
      <AssistenteCorrecaoDialog
        open={revisao}
        onOpenChange={(val) => {
          setRevisao(val);
          if (!val && search.revisao) {
            // Remove o parâmetro de query se fechar o dialog
            navigate({ to: "/dashboard/clientes/$id", params: { id: cliente.id } });
          }
        }}
        cliente={cliente}
      />

      <Dialog open={modalArquivarOpen} onOpenChange={setModalArquivarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Archive className="h-5 w-5" /> Arquivar Cliente
            </DialogTitle>
            <DialogDescription>
              O cliente "{cliente.nome}" será movido para o arquivo. Nenhum dado será excluído.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Motivo do Arquivamento *</Label>
            <Textarea
              placeholder="Descreva o motivo (mínimo 5 caracteres)..."
              value={motivoArquivamentoInput}
              onChange={(e) => setMotivoArquivamentoInput(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalArquivarOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleArquivar}
              disabled={processandoArquivamento}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Confirmar Arquivamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
