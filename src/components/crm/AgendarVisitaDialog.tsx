import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useClientes, useTecnicos } from "@/hooks/use-crm";
import { createAgendamentoAssistido, getAuvoTaskTypes } from "@/lib/integrations/auvo.server";
import { CalendarClock, CheckCircle, ShieldAlert, ArrowLeft, ArrowRight } from "lucide-react";

interface AgendarVisitaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClienteId?: string;
  onSuccess?: () => void;
}

export function AgendarVisitaDialog({
  open,
  onOpenChange,
  defaultClienteId,
  onSuccess,
}: AgendarVisitaDialogProps) {
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const [taskTypes, setTaskTypes] = useState<any[]>([]);

  const [step, setStep] = useState<"form" | "preview">("form");
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [clienteId, setClienteId] = useState(defaultClienteId || "");
  const [tecnicoId, setTecnicoId] = useState("");
  const [dataManutencao, setDataManutencao] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [duracaoEstimadaMin, setDuracaoEstimadaMin] = useState(60);
  const [tipo, setTipo] = useState("Preventiva");
  const [prioridade, setPrioridade] = useState("Média");
  const [descricao, setDescricao] = useState("");
  const [enderecoVisita, setEnderecoVisita] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");

  useEffect(() => {
    if (defaultClienteId) {
      setClienteId(defaultClienteId);
      const cli = clientes.find((c) => c.id === defaultClienteId);
      if (cli && cli.endereco) {
        setEnderecoVisita(`${cli.endereco}${cli.cidade ? `, ${cli.cidade}` : ""}`);
      }
    }
  }, [defaultClienteId, clientes]);

  useEffect(() => {
    async function loadTaskTypes() {
      try {
        const types = await getAuvoTaskTypes();
        setTaskTypes(types);
      } catch {
        // Fallback
      }
    }
    if (open) {
      loadTaskTypes();
    }
  }, [open]);

  const selectedCliente = clientes.find((c) => c.id === clienteId);
  const selectedTecnico = tecnicos.find((t) => t.id === tecnicoId);

  const handleClienteChange = (id: string) => {
    setClienteId(id);
    const cli = clientes.find((c) => c.id === id);
    if (cli) {
      setEnderecoVisita(`${cli.endereco || ""}${cli.cidade ? `, ${cli.cidade}` : ""}`);
    }
  };

  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      toast.error("Por favor, selecione um cliente.");
      return;
    }
    if (!dataManutencao) {
      toast.error("Por favor, selecione a data da visita.");
      return;
    }
    setStep("preview");
  };

  const handleConfirmAndSync = async () => {
    setSubmitting(true);
    try {
      const res = await createAgendamentoAssistido({
        data: {
          clienteId,
          dataManutencao: dataManutencao || (new Date().toISOString().split("T")[0] as string),
          horarioInicio,
          duracaoEstimadaMin,
          tipo,
          prioridade,
          ...(tecnicoId ? { tecnicoId } : {}),
          ...(descricao ? { descricao } : {}),
          ...(enderecoVisita ? { enderecoVisita } : {}),
          ...(observacoesInternas ? { observacoesInternas } : {}),
        },
      });

      if (res.success) {
        toast.success(res.message);
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      } else {
        toast.warning(res.error || "O agendamento foi salvo no CRM com aviso de erro do AUVO.");
        onSuccess?.();
        onOpenChange(false);
        resetForm();
      }
    } catch (err: any) {
      toast.error(`Erro ao criar agendamento: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    if (!defaultClienteId) setClienteId("");
    setTecnicoId("");
    setDataManutencao(new Date().toISOString().split("T")[0]);
    setHorarioInicio("09:00");
    setDuracaoEstimadaMin(60);
    setTipo("Preventiva");
    setPrioridade("Média");
    setDescricao("");
    setEnderecoVisita("");
    setObservacoesInternas("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {step === "form" ? "Agendar Visita Técnica" : "Prévia & Confirmação de Agendamento"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Preencha os detalhes operacionais para agendar a visita e enviá-la para o AUVO."
              : "Revise todas as informações antes de criar a tarefa no AUVO e salvar no CRM."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleGoToPreview} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={clienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger id="cliente">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.cidade ? `(${c.cidade})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tecnico">Técnico Responsável</Label>
                <Select value={tecnicoId} onValueChange={setTecnicoId}>
                  <SelectTrigger id="tecnico">
                    <SelectValue placeholder="Selecione o técnico..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome} ({t.especialidade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data da Visita *</Label>
                <Input
                  id="data"
                  type="date"
                  value={dataManutencao}
                  onChange={(e) => setDataManutencao(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horario">Horário Inicial *</Label>
                <Input
                  id="horario"
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duracao">Duração Estimada (min)</Label>
                <Select
                  value={String(duracaoEstimadaMin)}
                  onValueChange={(v) => setDuracaoEstimadaMin(Number(v))}
                >
                  <SelectTrigger id="duracao">
                    <SelectValue placeholder="Duração..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora (60m)</SelectItem>
                    <SelectItem value="90">1h 30m (90m)</SelectItem>
                    <SelectItem value="120">2 horas (120m)</SelectItem>
                    <SelectItem value="180">3 horas (180m)</SelectItem>
                    <SelectItem value="240">4 horas (240m)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Tarefa / Serviço *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Tipo de serviço..." />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.length > 0 ? (
                      taskTypes.map((tt) => (
                        <SelectItem key={tt.id} value={tt.name}>
                          {tt.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                        <SelectItem value="Instalação">Instalação</SelectItem>
                        <SelectItem value="Orçamento / Vistoria">
                          Orçamento / Vistoria
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade *</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger id="prioridade">
                    <SelectValue placeholder="Prioridade..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço da Visita</Label>
              <Input
                id="endereco"
                placeholder="Endereço completo para o GPS do técnico..."
                value={enderecoVisita}
                onChange={(e) => setEnderecoVisita(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do Serviço (Orientação ao Técnico)</Label>
              <Textarea
                id="descricao"
                placeholder="Detalhes dos serviços a serem realizados, equipamento, problemas relatados..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Internas (Somente CRM)</Label>
              <Textarea
                id="observacoes"
                placeholder="Anotações privadas para a equipe administrativa..."
                value={observacoesInternas}
                onChange={(e) => setObservacoesInternas(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                Avançar para Prévia <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Cliente:</span>
                  <span className="font-semibold">{selectedCliente?.nome || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Técnico:</span>
                  <span className="font-semibold">{selectedTecnico?.nome || "A definir"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Data & Horário:</span>
                  <span className="font-medium">
                    {dataManutencao} às {horarioInicio} ({duracaoEstimadaMin} min)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Tipo & Prioridade:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline">{tipo}</Badge>
                    <Badge variant={prioridade === "Urgente" || prioridade === "Alta" ? "destructive" : "secondary"}>
                      {prioridade}
                    </Badge>
                  </div>
                </div>
              </div>

              {enderecoVisita && (
                <div className="text-sm border-t pt-2">
                  <span className="text-muted-foreground block text-xs">Endereço:</span>
                  <span>{enderecoVisita}</span>
                </div>
              )}

              {descricao && (
                <div className="text-sm border-t pt-2">
                  <span className="text-muted-foreground block text-xs">Orientação ao Técnico:</span>
                  <p className="whitespace-pre-wrap text-xs bg-background p-2 rounded border mt-1">{descricao}</p>
                </div>
              )}

              {observacoesInternas && (
                <div className="text-sm border-t pt-2">
                  <span className="text-muted-foreground block text-xs">Observações Internas (CRM):</span>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground mt-0.5">{observacoesInternas}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-300 p-3 rounded-md text-xs flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Ao confirmar, o sistema enviará primeiro a solicitação para criar a tarefa no aplicativo do técnico pelo <strong>AUVO</strong>. O registro só será marcado como sincronizado localmente após resposta positiva da API do AUVO.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStep("form")}
                disabled={submitting}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar ao Formulário
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAndSync}
                disabled={submitting}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {submitting ? "Criando no AUVO..." : "Confirmar e Enviar para AUVO"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
