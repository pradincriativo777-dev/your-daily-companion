import { useState, useRef, useEffect } from "react";
import { MessageSquare, CheckCircle2, Calendar, FileText, CheckSquare, ExternalLink, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsert } from "@/hooks/use-crm";
import { limparAtendimentoPendente, type AuvoChatAtendimentoState } from "@/lib/auvo-chat-assistant";
import { toast } from "sonner";

export interface AuvoChatResultadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atendimento: AuvoChatAtendimentoState | null;
  userEmail?: string | null | undefined;
  onTriggerCriarTarefa?: (clienteId: string) => void;
  onTriggerCriarOS?: (clienteId: string) => void;
  onTriggerAgendarVisita?: (clienteId: string) => void;
  onNavegarFichaCliente?: (clienteId: string) => void;
}

const OPCOES_RESULTADO = [
  "Orçamento solicitado",
  "Orçamento enviado",
  "Visita necessária",
  "Suporte técnico",
  "Aguardando cliente",
  "Retornar posteriormente",
  "Venda concluída",
  "Atendimento encerrado",
  "Outro",
];

export function AuvoChatResultadoDialog({
  open,
  onOpenChange,
  atendimento,
  userEmail,
  onTriggerCriarTarefa,
  onTriggerCriarOS,
  onTriggerAgendarVisita,
  onNavegarFichaCliente,
}: AuvoChatResultadoDialogProps) {
  const upsertInteracao = useUpsert("interacoes");
  const upsertCliente = useUpsert("clientes");

  const [resultado, setResultado] = useState<string>("Atendimento encerrado");
  const [resumo, setResumo] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");
  const [dataRetorno, setDataRetorno] = useState("");
  const [prioridade, setPrioridade] = useState("Média");
  const [observacoes, setObservacoes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const isSavingRef = useRef(false);

  // Reset do formulário quando abrir novo atendimento
  useEffect(() => {
    if (open) {
      setResultado("Atendimento encerrado");
      setResumo("");
      setProximaAcao("");
      setDataRetorno("");
      setPrioridade("Média");
      setObservacoes("");
      setSubmitting(false);
      setSavedSuccess(false);
      isSavingRef.current = false;
    }
  }, [open, atendimento]);

  if (!atendimento) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Idempotência e proteção contra duplo clique
    if (isSavingRef.current || submitting) return;

    if (!resumo.trim()) {
      toast.error("Por favor, preencha o resumo do atendimento.");
      return;
    }

    isSavingRef.current = true;
    setSubmitting(true);

    try {
      const timestampIso = new Date().toISOString();
      const usuarioResponsavel = userEmail || atendimento.usuarioEmail || "Operador";

      // Formatar descrição da interação mantendo auditoria completa
      const descricaoFinal = `[Resultado: ${resultado}] ${resumo.trim()}${
        observacoes.trim() ? `\n\nObservações Internas: ${observacoes.trim()}` : ""
      }\n\nNota: Resultado registrado manualmente após atendimento no Auvo Chat.`;

      // 1. Criar a interação no Supabase
      await upsertInteracao.mutateAsync({
        cliente_id: atendimento.clienteId,
        data_interacao: timestampIso,
        tipo: "Auvo Chat",
        descricao: descricaoFinal,
        proximo_passo: proximaAcao.trim() || null,
        data_proximo_contato: dataRetorno ? new Date(dataRetorno).toISOString() : null,
        usuario: usuarioResponsavel,
      });

      // 2. Atualizar último contato do cliente no CRM
      await upsertCliente.mutateAsync({
        id: atendimento.clienteId,
        ultimo_contato: timestampIso,
      });

      // 3. Limpar estado temporário do sessionStorage
      limparAtendimentoPendente();

      toast.success("Resultado do atendimento salvo com sucesso!");
      setSavedSuccess(true);
    } catch (err) {
      console.error("Erro ao salvar resultado do atendimento Auvo Chat:", err);
      toast.error("Erro ao salvar resultado do atendimento. Tente novamente.");
    } finally {
      setSubmitting(false);
      isSavingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#F8F6F1] text-[#24231F] border-[#E2DDD0] p-6 shadow-2xl rounded-2xl">
        {!savedSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D1C19] text-[#E3B94F]">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#24231F]">
                    Registrar Resultado — Auvo Chat
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#706D65]">
                    Atendimento finalizado no Auvo Chat. Registre os detalhes para a equipe.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Banner de Dados do Cliente e Canal (Readonly) */}
            <div className="rounded-xl border border-[#E2DDD0] bg-white p-3 space-y-1 text-xs">
              <div className="flex justify-between items-center text-[#706D65]">
                <span>Cliente:</span>
                <span className="font-bold text-[#24231F] truncate max-w-[220px]">
                  {atendimento.clienteNome}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#706D65]">
                <span>Telefone Copiado:</span>
                <span className="font-mono text-[#1D1C19] bg-[#FAF5E8] px-1.5 py-0.5 rounded text-[11px] font-semibold border border-[#E2DDD0]">
                  {atendimento.telefoneNormalizado}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#706D65]">
                <span>Canal:</span>
                <span className="font-medium text-[#C8794A]">Auvo Chat / WhatsApp</span>
              </div>
            </div>

            {/* Campo Resultado (Obrigatório) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#24231F] flex items-center gap-1">
                Resultado do Atendimento <span className="text-[#C53030]">*</span>
              </label>
              <Select value={resultado} onValueChange={setResultado}>
                <SelectTrigger className="h-9 bg-white border-[#E2DDD0] text-xs">
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2DDD0] text-xs">
                  {OPCOES_RESULTADO.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>
                      {opcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo Resumo Operacional (Obrigatório) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#24231F] flex items-center justify-between">
                <span>Resumo Operacional <span className="text-[#C53030]">*</span></span>
                <span className="text-[10px] font-normal text-[#8E8C82]">Não exige copiar mensagens</span>
              </label>
              <Textarea
                rows={3}
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                placeholder="Ex: Cliente solicitou orçamento para manutenção preventiva de coletor solar. Enviar proposta até amanhã..."
                className="bg-white border-[#E2DDD0] text-xs resize-none placeholder:text-[#A09D96]"
                required
              />
            </div>

            {/* Próxima Ação e Data Retorno (Opcionais) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#706D65]">Próxima Ação</label>
                <Input
                  value={proximaAcao}
                  onChange={(e) => setProximaAcao(e.target.value)}
                  placeholder="Ex: Enviar proposta"
                  className="h-9 bg-white border-[#E2DDD0] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#706D65]">Data do Retorno</label>
                <Input
                  type="date"
                  value={dataRetorno}
                  onChange={(e) => setDataRetorno(e.target.value)}
                  className="h-9 bg-white border-[#E2DDD0] text-xs"
                />
              </div>
            </div>

            {/* Prioridade e Observações */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#706D65]">Prioridade</label>
                  <Select value={prioridade} onValueChange={setPrioridade}>
                    <SelectTrigger className="h-9 bg-white border-[#E2DDD0] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E2DDD0] text-xs">
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <span className="text-[11px] text-[#706D65]">
                    Responsável: <strong className="text-[#1D1C19]">{userEmail || atendimento.usuarioEmail || "Operador"}</strong>
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#706D65]">Observações Internas (opcional)</label>
                <Textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Anotações internas restritas à equipe..."
                  className="bg-white border-[#E2DDD0] text-xs resize-none placeholder:text-[#A09D96]"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#E2DDD0] text-xs text-[#706D65]"
                disabled={submitting}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#1D1C19] text-[#F8F6F1] hover:bg-[#292722] text-xs font-bold px-4"
              >
                {submitting ? "Salvando..." : "Salvar Interação"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* TELA DE PRÓXIMAS AÇÕES OPCIONAIS PÓS-SALVAMENTO */
          <div className="space-y-5 text-center py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBFBEE] text-[#2F855A] mx-auto border border-[#C6F6D5]">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#24231F]">Interação Registrada com Sucesso!</h3>
              <p className="text-xs text-[#706D65]">
                O atendimento foi vinculado ao cliente <strong>{atendimento.clienteNome}</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-[#E2DDD0] bg-white p-4 space-y-2 text-left">
              <p className="text-xs font-bold text-[#24231F] uppercase tracking-wider text-[10px] text-[#706D65]">
                Deseja realizar uma próxima ação agora?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {onTriggerCriarTarefa && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onTriggerCriarTarefa(atendimento.clienteId);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-[#E2DDD0] bg-[#F8F6F1] p-2.5 text-xs font-semibold text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E3B94F] transition-colors text-left"
                  >
                    <CheckSquare className="h-4 w-4 text-[#C8794A]" />
                    <span>+ Criar Tarefa</span>
                  </button>
                )}

                {onTriggerCriarOS && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onTriggerCriarOS(atendimento.clienteId);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-[#E2DDD0] bg-[#F8F6F1] p-2.5 text-xs font-semibold text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E3B94F] transition-colors text-left"
                  >
                    <FileText className="h-4 w-4 text-[#C8794A]" />
                    <span>+ Criar Ordem de Serviço</span>
                  </button>
                )}

                {onTriggerAgendarVisita && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onTriggerAgendarVisita(atendimento.clienteId);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-[#E2DDD0] bg-[#F8F6F1] p-2.5 text-xs font-semibold text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E3B94F] transition-colors text-left"
                  >
                    <Calendar className="h-4 w-4 text-[#C8794A]" />
                    <span>+ Agendar Visita</span>
                  </button>
                )}

                {onNavegarFichaCliente && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onNavegarFichaCliente(atendimento.clienteId);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-[#E2DDD0] bg-[#F8F6F1] p-2.5 text-xs font-semibold text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E3B94F] transition-colors text-left"
                  >
                    <ExternalLink className="h-4 w-4 text-[#706D65]" />
                    <span>Ver Ficha 360°</span>
                  </button>
                )}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-[#1D1C19] text-[#F8F6F1] hover:bg-[#292722] text-xs font-bold w-full"
            >
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
