import { useState, useEffect } from "react";
import { Cliente, Tecnico, OrdemServico } from "@/hooks/use-crm";
import { ClienteComboboxAsync } from "@/components/crm/ClienteComboboxAsync";
import { ORDENS_STATUS_LIST, OrdemStatus } from "@/lib/ordens-servico";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface OrdemServicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: Cliente[];
  tecnicos: Tecnico[];
  ordemParaEditar?: OrdemServico | null;
  onSave: (dados: Record<string, any>) => Promise<void>;
}

export function OrdemServicoDialog({
  open,
  onOpenChange,
  clientes,
  tecnicos,
  ordemParaEditar,
  onSave,
}: OrdemServicoDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [tipoAtendimento, setTipoAtendimento] = useState("Manutenção Preventiva");
  const [prioridade, setPrioridade] = useState("Média");
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [servicoSolicitado, setServicoSolicitado] = useState("");
  const [enderecoVisita, setEnderecoVisita] = useState("");
  const [dataPrevista, setDataPrevista] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [horarioInicio, setHorarioInicio] = useState("09:00");
  const [duracaoEstimadaMin, setDuracaoEstimadaMin] = useState(60);
  const [origemSolicitacao, setOrigemSolicitacao] = useState("WhatsApp");
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [status, setStatus] = useState<OrdemStatus>("Aguardando agendamento");

  useEffect(() => {
    if (ordemParaEditar) {
      setClienteId(ordemParaEditar.cliente_id || "");
      setTecnicoId(ordemParaEditar.tecnico_id || "");
      setTipoAtendimento(ordemParaEditar.tipo_atendimento || "Manutenção Preventiva");
      setPrioridade(ordemParaEditar.prioridade || "Média");
      setDescricaoProblema(ordemParaEditar.descricao_problema || "");
      setServicoSolicitado(ordemParaEditar.servico_solicitado || "");
      setEnderecoVisita(ordemParaEditar.endereco_visita || "");
      setDataPrevista(
        ordemParaEditar.data_prevista || new Date().toISOString().split("T")[0],
      );
      setHorarioInicio(ordemParaEditar.horario_inicio || "09:00");
      setDuracaoEstimadaMin(ordemParaEditar.duracao_estimada_min || 60);
      setOrigemSolicitacao(ordemParaEditar.origem_solicitacao || "WhatsApp");
      setObservacoesInternas(ordemParaEditar.observacoes_internas || "");
      setStatus((ordemParaEditar.status as OrdemStatus) || "Aguardando agendamento");
    } else {
      setClienteId("");
      setTecnicoId("");
      setTipoAtendimento("Manutenção Preventiva");
      setPrioridade("Média");
      setDescricaoProblema("");
      setServicoSolicitado("");
      setEnderecoVisita("");
      setDataPrevista(new Date().toISOString().split("T")[0]);
      setHorarioInicio("09:00");
      setDuracaoEstimadaMin(60);
      setOrigemSolicitacao("WhatsApp");
      setObservacoesInternas("");
      setStatus("Aguardando agendamento");
    }
  }, [ordemParaEditar, open]);

  // Atualiza endereço automaticamente ao selecionar cliente se estiver vazio
  const handleClienteChange = (id: string) => {
    setClienteId(id);
    if (!enderecoVisita) {
      const cli = clientes.find((c) => c.id === id);
      if (cli && cli.endereco) {
        setEnderecoVisita(`${cli.endereco}${cli.cidade ? `, ${cli.cidade}` : ""}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Impede submissão duplicada

    if (!clienteId) {
      toast.error("Por favor, selecione um cliente.");
      return;
    }
    if (!descricaoProblema.trim()) {
      toast.error("Por favor, descreva o problema ou necessidade.");
      return;
    }
    if (!enderecoVisita.trim()) {
      toast.error("Por favor, informe o endereço da visita.");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        ...(ordemParaEditar ? { id: ordemParaEditar.id } : {}),
        cliente_id: clienteId,
        tecnico_id: tecnicoId || null,
        tipo_atendimento: tipoAtendimento,
        prioridade,
        descricao_problema: descricaoProblema,
        servico_solicitado: servicoSolicitado || null,
        endereco_visita: enderecoVisita,
        data_prevista: dataPrevista,
        horario_inicio: horarioInicio,
        duracao_estimada_min: Number(duracaoEstimadaMin) || 60,
        origem_solicitacao: origemSolicitacao,
        observacoes_internas: observacoesInternas || null,
        status,
        version: ordemParaEditar ? ordemParaEditar.version : 1,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar Ordem de Serviço.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ordemParaEditar ? `Editar ${ordemParaEditar.codigo}` : "Nova Ordem de Serviço"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados operacionais da Ordem de Serviço.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente *</Label>
              <ClienteComboboxAsync
                value={clienteId}
                onValueChange={(id, cli) => {
                  setClienteId(id);
                  if (!enderecoVisita && cli && cli.endereco) {
                    setEnderecoVisita(`${cli.endereco}${cli.cidade ? `, ${cli.cidade}` : ""}`);
                  }
                }}
                placeholder="Pesquisar cliente por nome ou cidade..."
              />
            </div>

            {/* Técnico */}
            <div className="space-y-1.5">
              <Label htmlFor="tecnico">Técnico Responsável</Label>
              <Select value={tecnicoId} onValueChange={setTecnicoId}>
                <SelectTrigger id="tecnico">
                  <SelectValue placeholder="Selecione o técnico (Opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Nenhum / A definir --</SelectItem>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} ({t.especialidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Atendimento */}
            <div className="space-y-1.5">
              <Label htmlFor="tipoAtendimento">Tipo de Atendimento</Label>
              <Select value={tipoAtendimento} onValueChange={setTipoAtendimento}>
                <SelectTrigger id="tipoAtendimento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manutenção Preventiva">Manutenção Preventiva</SelectItem>
                  <SelectItem value="Manutenção Corretiva">Manutenção Corretiva</SelectItem>
                  <SelectItem value="Instalação">Instalação</SelectItem>
                  <SelectItem value="Vistoria / Orçamento">Vistoria / Orçamento</SelectItem>
                  <SelectItem value="Garantia / Chamado">Garantia / Chamado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prioridade */}
            <div className="space-y-1.5">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger id="prioridade">
                  <SelectValue />
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

          {/* Descrição do Problema */}
          <div className="space-y-1.5">
            <Label htmlFor="descricaoProblema">Descrição do Problema / Necessidade *</Label>
            <Textarea
              id="descricaoProblema"
              placeholder="Descreva detalhadamente a solicitação ou defeito informado..."
              rows={3}
              value={descricaoProblema}
              onChange={(e) => setDescricaoProblema(e.target.value)}
            />
          </div>

          {/* Serviço Solicitado */}
          <div className="space-y-1.5">
            <Label htmlFor="servicoSolicitado">Serviço Solicitado / Escopo</Label>
            <Input
              id="servicoSolicitado"
              placeholder="Ex: Troca de válvula coletora solar + limpeza"
              value={servicoSolicitado}
              onChange={(e) => setServicoSolicitado(e.target.value)}
            />
          </div>

          {/* Endereço */}
          <div className="space-y-1.5">
            <Label htmlFor="enderecoVisita">Endereço da Visita *</Label>
            <Input
              id="enderecoVisita"
              placeholder="Rua, Número, Bairro, Cidade..."
              value={enderecoVisita}
              onChange={(e) => setEnderecoVisita(e.target.value)}
            />
          </div>

          {/* Data, Horário e Duração */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dataPrevista">Data Prevista *</Label>
              <Input
                id="dataPrevista"
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="horarioInicio">Horário Inicial</Label>
              <Input
                id="horarioInicio"
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duracaoEstimadaMin">Duração Estimada (min)</Label>
              <Input
                id="duracaoEstimadaMin"
                type="number"
                min={15}
                step={15}
                value={duracaoEstimadaMin}
                onChange={(e) => setDuracaoEstimadaMin(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Origem e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="origemSolicitacao">Origem da Solicitação</Label>
              <Select value={origemSolicitacao} onValueChange={setOrigemSolicitacao}>
                <SelectTrigger id="origemSolicitacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="Site / Landing Page">Site / Landing Page</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Interno">Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status Inicial</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OrdemStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDENS_STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações Internas */}
          <div className="space-y-1.5">
            <Label htmlFor="observacoesInternas">Observações Internas</Label>
            <Textarea
              id="observacoesInternas"
              placeholder="Instruções para o técnico, pontos de atenção ou notas de apoio..."
              rows={2}
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvação..." : ordemParaEditar ? "Atualizar Ordem" : "Criar Ordem de Serviço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
