import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, Plus, CheckCircle2, RotateCcw, Pencil, History, User, Calendar, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Loading, EmptyState } from "@/components/crm/ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClienteComboboxAsync } from "@/components/crm/ClienteComboboxAsync";
import { fetchTarefasServer, upsertTarefaServer } from "@/lib/tarefas.server";
import { useTecnicos } from "@/hooks/use-crm";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/tarefas")({
  head: () => ({
    meta: [
      { title: "Central de Tarefas & Pendências · JANSOL Admin" },
      { name: "description", content: "Central de tarefas operacionais reais do CRM JANSOL." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TarefasPage,
});

function TarefasPage() {
  const { data: tecnicos = [] } = useTecnicos();
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<any | null>(null);

  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("Média");
  const [status, setStatus] = useState("Pendente");
  const [responsavelId, setResponsavelId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [processando, setProcessando] = useState(false);

  const carregarTarefas = async () => {
    setLoading(true);
    try {
      const res = await (fetchTarefasServer as any)();
      setTarefas(res || []);
    } catch (err) {
      toast.error("Erro ao carregar tarefas do servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTarefas();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setTitulo("");
    setDescricao("");
    setPrioridade("Média");
    setStatus("Pendente");
    setResponsavelId("");
    setPrazo("");
    setClienteId("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (t: any) => {
    setEditId(t.id);
    setTitulo(t.titulo || "");
    setDescricao(t.descricao || "");
    setPrioridade(t.prioridade || "Média");
    setStatus(t.status || "Pendente");
    setResponsavelId(t.responsavel_id || "");
    setPrazo(t.prazo ? t.prazo.slice(0, 10) : "");
    setClienteId(t.cliente_id || "");
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      toast.error("Por favor, preencha o título da tarefa.");
      return;
    }

    setProcessando(true);
    try {
      await (upsertTarefaServer as any)({
        data: {
          id: editId || undefined,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          prioridade,
          status,
          responsavel_id: responsavelId || null,
          prazo: prazo || null,
          cliente_id: clienteId || null,
        },
      });
      toast.success(editId ? "Tarefa atualizada com sucesso." : "Tarefa criada com sucesso.");
      setDialogOpen(false);
      resetForm();
      carregarTarefas();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar tarefa.");
    } finally {
      setProcessando(false);
    }
  };

  const handleToggleStatus = async (t: any) => {
    const novoStatus = t.status === "Concluída" ? "Pendente" : "Concluída";
    try {
      await (upsertTarefaServer as any)({
        data: {
          id: t.id,
          titulo: t.titulo,
          status: novoStatus,
        },
      });
      toast.success(`Tarefa "${t.titulo}" alterada para ${novoStatus}.`);
      carregarTarefas();
    } catch (err) {
      toast.error("Falha ao atualizar status da tarefa.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Tarefas & Pendências"
        description="Acompanhamento operacional de pendências de ordens, visitas e manutenções."
      >
        <Button onClick={handleOpenCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="mr-1.5 h-4 w-4" /> Nova Tarefa
        </Button>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Pendências Operacionais
            </CardTitle>
            <CardDescription>
              Tarefas reais registradas na base do CRM JANSOL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tarefas.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded border bg-card gap-3">
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(t)}
                    aria-label={t.status === "Concluída" ? "Reabrir tarefa" : "Concluir tarefa"}
                    className="h-8 w-8 text-primary shrink-0 mt-0.5"
                  >
                    {t.status === "Concluída" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <CheckSquare className="h-5 w-5 text-slate-400" />
                    )}
                  </Button>
                  <div>
                    <p className={`font-semibold text-sm ${t.status === "Concluída" ? "line-through text-muted-foreground" : ""}`}>
                      {t.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.descricao || "Sem descrição."}</p>
                    {t.prazo && (
                      <span className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" /> Prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Badge variant={t.prioridade === "Alta" || t.prioridade === "Urgente" ? "destructive" : "secondary"}>
                    {t.prioridade || "Média"}
                  </Badge>
                  <Badge variant="outline">{t.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(t)}
                    aria-label="Editar tarefa"
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {tarefas.length === 0 && (
              <EmptyState title="Nenhuma tarefa registrada" description="Clique em 'Nova Tarefa' para criar a primeira pendência." />
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Criar / Editar Tarefa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Tarefa" : "Nova Tarefa Operacional"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da pendência técnica ou administrativa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Título *</Label>
              <Input
                placeholder="Ex: Verificar vazamento no coletor..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Descrição</Label>
              <Textarea
                placeholder="Detalhes adicionais da pendência..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Responsável</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {tecnicos.map((tec) => (
                      <SelectItem key={tec.id} value={tec.id}>
                        {tec.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Prazo Limite</Label>
                <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Cliente Vinculado (Opcional)</Label>
              <ClienteComboboxAsync
                value={clienteId}
                onValueChange={(val: string) => setClienteId(val)}
                placeholder="Buscar cliente..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={processando} className="bg-primary">
              {processando ? "Salvando..." : editId ? "Salvar Alterações" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
