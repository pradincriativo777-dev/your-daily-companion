import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  Download,
  Share2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Wrench,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AUVO_CHAT_URL } from "@/lib/config";
import {
  validarPacoteTecnico,
  sanitizarDadosTecnico,
  gerarPdfPacoteTecnico,
  gerarMensagemAcompanhamentoTecnico,
  incrementarVersaoPacote,
  type OrdemServicoCompletaPacote,
} from "@/lib/pacote-tecnico";
import {
  obterHistoricoPacotes,
  obterUltimaVersaoGerada,
  registrarGeracaoPacote,
  marcarPacoteEnviadoManualmente,
  type PacoteTecnicoHistoricoItem,
} from "@/lib/pacote-tecnico-history";
import { toast } from "sonner";

export interface PacoteTecnicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemServico: OrdemServicoCompletaPacote | null;
  userEmail?: string | null;
  onEditarOS?: (os: OrdemServicoCompletaPacote) => void;
}

export function PacoteTecnicoModal({
  open,
  onOpenChange,
  ordemServico,
  userEmail,
  onEditarOS,
}: PacoteTecnicoModalProps) {
  const [step, setStep] = useState<"validacao" | "previa" | "acoes">("validacao");
  const [confirmacaoSemMateriais, setConfirmacaoSemMateriais] = useState(false);
  const [versaoAtualNum, setVersaoAtualNum] = useState(1);

  const [historico, setHistorico] = useState<PacoteTecnicoHistoricoItem[]>([]);
  const [mensagemFormatada, setMensagemFormatada] = useState("");
  const [observacaoEnvio, setObservacaoEnvio] = useState("");

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    if (open && ordemServico) {
      setConfirmacaoSemMateriais(Boolean(ordemServico.confirmacao_sem_materiais));

      const ultimaVersao = obterUltimaVersaoGerada(ordemServico.id);
      const proximaVersaoNum = ultimaVersao === 0 ? 1 : ultimaVersao;
      setVersaoAtualNum(proximaVersaoNum);

      const h = obterHistoricoPacotes(ordemServico.id);
      setHistorico(h);

      if (h.length > 0) {
        setStep("acoes");
      } else {
        setStep("validacao");
      }

      setMensagemFormatada(
        gerarMensagemAcompanhamentoTecnico(ordemServico, proximaVersaoNum)
      );
      setObservacaoEnvio("");
    }
  }, [open, ordemServico]);

  if (!ordemServico) return null;

  const osComConfirmacao: OrdemServicoCompletaPacote = {
    ...ordemServico,
    confirmacao_sem_materiais: confirmacaoSemMateriais,
  };

  const validacao = validarPacoteTecnico(osComConfirmacao);
  const dtoSanitizado = sanitizarDadosTecnico(osComConfirmacao, versaoAtualNum);

  // Ação de Gerar PDF
  const handleGerarPdf = () => {
    if (!validacao.valido) {
      toast.error("Preencha todas as pendências obrigatórias antes de gerar o PDF.");
      return;
    }

    setGerandoPdf(true);

    try {
      const doc = gerarPdfPacoteTecnico(osComConfirmacao, versaoAtualNum);
      setPdfDoc(doc);

      // Registrar geração no histórico local
      registrarGeracaoPacote(
        ordemServico.id,
        versaoAtualNum,
        userEmail || null,
        ordemServico.tecnico_nome || null,
        osComConfirmacao.materiais?.length || 0,
        osComConfirmacao.etapas?.length || 0
      );

      // Atualizar histórico
      const h = obterHistoricoPacotes(ordemServico.id);
      setHistorico(h);

      toast.success(`Pacote do Técnico v${versaoAtualNum} gerado com sucesso!`);
      setStep("acoes");
    } catch (err) {
      console.error("Erro ao gerar PDF do Pacote do Técnico:", err);
      toast.error("Erro ao gerar o PDF. Verifique os dados e tente novamente.");
    } finally {
      setGerandoPdf(false);
    }
  };

  // Baixar PDF
  const handleBaixarPdf = () => {
    try {
      const doc = pdfDoc || gerarPdfPacoteTecnico(osComConfirmacao, versaoAtualNum);
      doc.save(`JANSOL_OS_${dtoSanitizado.codigoOS}_v${versaoAtualNum}.pdf`);
      toast.success("Download do PDF iniciado!");
    } catch (err) {
      toast.error("Erro ao realizar o download do PDF.");
    }
  };

  // Compartilhar via Web Share API nativo (Mobile/Browser)
  const handleCompartilhar = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `OS ${dtoSanitizado.codigoOS} — Pacote do Técnico (${dtoSanitizado.versaoPacote})`,
          text: mensagemFormatada,
        });
        toast.success("Compartilhamento iniciado!");
      } catch {
        // Ignorar cancelamento
      }
    } else {
      handleCopiarMensagem();
    }
  };

  // Copiar Mensagem de Acompanhamento
  const handleCopiarMensagem = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(mensagemFormatada);
      toast.success("Mensagem copiada para a área de transferência!");
    }
  };

  // Marcar como Enviado Manualmente
  const handleMarcarEnviado = () => {
    const versaoStr = `v${versaoAtualNum}`;
    const ok = marcarPacoteEnviadoManualmente(
      ordemServico.id,
      versaoStr,
      userEmail || null,
      "WhatsApp / Auvo Chat",
      observacaoEnvio.trim() || null
    );

    if (ok) {
      toast.success(`Versão ${versaoStr} marcada como enviada ao técnico!`);
      setHistorico(obterHistoricoPacotes(ordemServico.id));
      setObservacaoEnvio("");
    } else {
      toast.error("Não foi possível atualizar o histórico de envio.");
    }
  };

  // Gerar Nova Versão (v2, v3...)
  const handleGerarNovaVersao = () => {
    const proximaNum = versaoAtualNum + 1;
    setVersaoAtualNum(proximaNum);
    setMensagemFormatada(
      gerarMensagemAcompanhamentoTecnico(ordemServico, proximaNum)
    );
    setStep("validacao");
    toast.info(`Preparando nova versão v${proximaNum}...`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#F8F6F1] text-[#24231F] border-[#E2DDD0] p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 text-left border-b border-[#E2DDD0] pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#100D3F] text-[#E2B321]">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#100D3F] flex items-center gap-2">
                  Pacote do Técnico — OS {dtoSanitizado.codigoOS}
                  <Badge variant="outline" className="border-[#E2B321] text-[#100D3F] font-bold text-[10px]">
                    v{versaoAtualNum}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#706D65]">
                  Versão profissional sanitizada em PDF para ser enviada à equipe técnica.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* --- PASSO 1: VALIDAÇÃO & CONFERÊNCIA --- */}
        {step === "validacao" && (
          <div className="space-y-4 py-2">
            {!validacao.valido ? (
              <div className="rounded-xl border border-[#FEB2B2] bg-[#FFF5F5] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C53030]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Pendências para a geração do Pacote do Técnico</span>
                </div>
                <ul className="space-y-1 pl-6 list-disc text-xs text-[#9B2C2C]">
                  {validacao.pendencias.map((pend, idx) => (
                    <li key={idx}>{pend}</li>
                  ))}
                </ul>
                {onEditarOS && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onEditarOS(ordemServico);
                    }}
                    className="mt-2 border-[#FEB2B2] bg-white text-[#C53030] text-xs font-bold hover:bg-[#FFF5F5]"
                  >
                    Editar OS no Formulário Completo
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[#C6F6D5] bg-[#EBFBEE] p-3 flex items-center gap-2.5 text-xs text-[#2F855A]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Todos os campos obrigatórios estão validados!</strong> A OS está pronta para a prévia do pacote.
                </span>
              </div>
            )}

            {/* Confirmação para OS sem materiais */}
            {(!ordemServico.materiais || ordemServico.materiais.length === 0) && (
              <div className="rounded-xl border border-[#E2DDD0] bg-white p-3 space-y-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="chk-sem-materiais"
                    checked={confirmacaoSemMateriais}
                    onCheckedChange={(c) => setConfirmacaoSemMateriais(Boolean(c))}
                    className="mt-0.5"
                  />
                  <div>
                    <label htmlFor="chk-sem-materiais" className="text-xs font-bold text-[#24231F] cursor-pointer">
                      Este serviço realmente não necessita de materiais?
                    </label>
                    <p className="text-[11px] text-[#706D65]">
                      Marque esta opção caso a manutenção consista apenas de mão de obra ou inspeção técnica.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo da Sanitização DTO (Confirmação de Proteção Financeira) */}
            <div className="rounded-xl border border-[#E2DDD0] bg-white p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#100D3F]">
                <ShieldCheck className="h-4 w-4 text-[#2F855A]" />
                <span>Isolamento DTO de Dados Internos</span>
              </div>
              <p className="text-xs text-[#706D65] leading-relaxed">
                Nenhum valor financeiro (preço orçado, custos, recebimentos, lucros ou observações restritas) será incluído no documento do técnico.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E2DDD0]/60">
                <div>
                  <span className="text-[#8E8C82] block text-[10px] uppercase font-bold">Cliente / Local</span>
                  <strong className="text-[#24231F] block truncate">{dtoSanitizado.clienteNome}</strong>
                  <span className="text-[11px] text-[#706D65] block truncate">{dtoSanitizado.enderecoObra}</span>
                </div>
                <div>
                  <span className="text-[#8E8C82] block text-[10px] uppercase font-bold">Técnico / Data</span>
                  <strong className="text-[#24231F] block truncate">{dtoSanitizado.tecnicoOuEquipe}</strong>
                  <span className="text-[11px] text-[#706D65] block truncate">{dtoSanitizado.dataHorarioAgendado}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#E2DDD0] text-xs text-[#706D65]"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!validacao.valido}
                onClick={() => setStep("previa")}
                className="bg-[#100D3F] text-white hover:bg-[#1A165C] text-xs font-bold px-4"
              >
                Visualizar Prévia do Pacote <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* --- PASSO 2: PRÉVIA DO PACOTE --- */}
        {step === "previa" && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-[#C6F6D5] bg-[#EBFBEE] p-3 text-xs text-[#2F855A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span><strong>Segurança Garantida:</strong> Valores financeiros totalmente isolados.</span>
              </div>
              <Badge className="bg-[#100D3F] text-[#E2B321] text-[10px] font-bold">
                Versão {dtoSanitizado.versaoPacote}
              </Badge>
            </div>

            {/* Card Visual de Prévia do PDF */}
            <div className="rounded-2xl border border-[#E2DDD0] bg-white p-5 space-y-4 shadow-sm text-xs">
              <div className="border-b border-[#E2DDD0] pb-3 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-[#100D3F]">ORDEM DE SERVIÇO — EXECUÇÃO TÉCNICA</h3>
                  <p className="text-[11px] text-[#706D65]">OS {dtoSanitizado.codigoOS} · {dtoSanitizado.tipoAtendimento}</p>
                </div>
                <span className="text-[10px] font-mono bg-[#FAF5E8] px-2 py-0.5 rounded text-[#100D3F] font-bold border border-[#E2DDD0]">
                  {dtoSanitizado.versaoPacote}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8E8C82] text-[10px] uppercase font-bold block">Cliente & Obra</span>
                  <p className="font-bold text-[#24231F]">{dtoSanitizado.clienteNome}</p>
                  <p className="text-[#706D65]">{dtoSanitizado.enderecoObra}</p>
                  <p className="text-[#706D65]">Contato: {dtoSanitizado.clienteTelefone}</p>
                </div>
                <div>
                  <span className="text-[#8E8C82] text-[10px] uppercase font-bold block">Agendamento</span>
                  <p className="font-bold text-[#24231F]">{dtoSanitizado.dataHorarioAgendado}</p>
                  <p className="text-[#706D65]">Técnico: {dtoSanitizado.tecnicoOuEquipe}</p>
                  <p className="text-[#706D65]">Duração: {dtoSanitizado.duracaoEstimadaMin} min</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E2DDD0]/60">
                <span className="text-[#8E8C82] text-[10px] uppercase font-bold block">Objetivo & Escopo Técnico</span>
                <p className="text-[#24231F] font-semibold">{dtoSanitizado.objetivoAtendimento}</p>
                <p className="text-[#706D65]">{dtoSanitizado.escopoTecnico}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E2DDD0]/60">
                <span className="text-[#8E8C82] text-[10px] uppercase font-bold block">Etapas de Execução (Caixas em branco no PDF)</span>
                <div className="space-y-1 pl-2">
                  {dtoSanitizado.etapas.map((e) => (
                    <div key={e.ordem} className="flex items-center gap-2 text-xs text-[#24231F]">
                      <span className="font-mono text-[#8E8C82]">☐</span>
                      <span>{e.ordem}ª Etapa: {e.descricao}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E2DDD0]/60">
                <span className="text-[#8E8C82] text-[10px] uppercase font-bold block">Materiais Previstos ({dtoSanitizado.materiais.length})</span>
                {dtoSanitizado.materiais.length > 0 ? (
                  <div className="space-y-1">
                    {dtoSanitizado.materiais.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-[#E2DDD0]/30 last:border-0">
                        <span className="font-medium text-[#24231F]">{m.item}</span>
                        <span className="font-mono text-[#706D65]">{m.quantidade} {m.unidade}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#706D65] italic">Sem materiais previstos para este serviço.</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("validacao")}
                className="border-[#E2DDD0] text-xs text-[#706D65]"
              >
                Voltar e Editar
              </Button>
              <Button
                type="button"
                disabled={gerandoPdf}
                onClick={handleGerarPdf}
                className="bg-[#100D3F] text-white hover:bg-[#1A165C] text-xs font-bold px-4"
              >
                {gerandoPdf ? "Gerando PDF..." : "Confirmar e Gerar PDF Profissional"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* --- PASSO 3: AÇÕES PÓS-GERAÇÃO E HISTÓRICO --- */}
        {step === "acoes" && (
          <div className="space-y-5 py-2">
            <div className="rounded-xl border border-[#C6F6D5] bg-[#EBFBEE] p-3 text-xs text-[#2F855A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span><strong>Pacote Gerado!</strong> PDF pronto para download e compartilhamento.</span>
              </div>
              <Badge className="bg-[#100D3F] text-[#E2B321] text-[10px] font-bold">
                Versão {dtoSanitizado.versaoPacote}
              </Badge>
            </div>

            {/* Grade de Ações Diretas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={handleBaixarPdf}
                className="bg-[#100D3F] text-white hover:bg-[#1A165C] text-xs font-bold h-10 rounded-xl justify-start px-3"
              >
                <Download className="mr-2 h-4 w-4 text-[#E2B321]" />
                Baixar PDF da OS (A4)
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCompartilhar}
                className="border-[#E2DDD0] bg-white text-[#1D1C19] hover:bg-[#FAF5E8] text-xs font-bold h-10 rounded-xl justify-start px-3"
              >
                <Share2 className="mr-2 h-4 w-4 text-[#C8794A]" />
                Compartilhar no Celular
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopiarMensagem}
                className="border-[#E2DDD0] bg-white text-[#1D1C19] hover:bg-[#FAF5E8] text-xs font-bold h-10 rounded-xl justify-start px-3"
              >
                <Copy className="mr-2 h-4 w-4 text-[#706D65]" />
                Copiar Mensagem de Acompanhamento
              </Button>

              <a
                href={AUVO_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-start rounded-xl border border-[#E2DDD0] bg-white px-3 py-2 text-xs font-bold text-[#1D1C19] hover:bg-[#FAF5E8] hover:border-[#E2B321] transition-colors h-10"
              >
                <ExternalLink className="mr-2 h-4 w-4 text-[#C8794A]" />
                Abrir Auvo Chat (Opcional)
              </a>
            </div>

            {/* Mensagem Editável de Acompanhamento */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-[#24231F] flex items-center justify-between">
                <span>Mensagem de Acompanhamento (Editável)</span>
                <span className="text-[10px] text-[#8E8C82]">Pronta para colar</span>
              </label>
              <Textarea
                rows={3}
                value={mensagemFormatada}
                onChange={(e) => setMensagemFormatada(e.target.value)}
                className="bg-white border-[#E2DDD0] text-xs resize-none"
              />
            </div>

            {/* Marcar como Enviado Manualmente */}
            <div className="rounded-xl border border-[#E2DDD0] bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#24231F] flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-[#C8794A]" />
                  Marcar Envio Manual do Pacote
                </span>
                <span className="text-[10px] text-[#8E8C82]">Registro de Auditoria</span>
              </div>

              <Textarea
                rows={2}
                value={observacaoEnvio}
                onChange={(e) => setObservacaoEnvio(e.target.value)}
                placeholder="Observações do envio (ex: Enviado ao técnico Carlos via WhatsApp do plantão)..."
                className="bg-[#F8F6F1] border-[#E2DDD0] text-xs resize-none placeholder:text-[#A09D96]"
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMarcarEnviado}
                  className="bg-[#24231F] text-white hover:bg-[#383630] text-xs font-bold h-8"
                >
                  Confirmar Envio Manual
                </Button>
              </div>
            </div>

            {/* Seção de Histórico e Auditoria de Versões */}
            <div className="space-y-2 pt-2 border-t border-[#E2DDD0]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#100D3F] flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#706D65]" />
                  Histórico de Versões e Registros de Envio
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleGerarNovaVersao}
                  className="text-xs text-[#100D3F] font-bold hover:bg-[#FAF5E8] h-7 px-2"
                >
                  <RefreshCw className="mr-1 h-3 w-3" /> Gerar Nova Versão (v{versaoAtualNum + 1})
                </Button>
              </div>

              {historico.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {historico.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[#E2DDD0] bg-white p-2.5 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#100D3F]">{item.versao}</span>
                        <Badge
                          variant={item.statusEnvio === "Enviado manualmente" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {item.statusEnvio}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#706D65]">
                        Gerado em {format(new Date(item.geradoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {item.geradoPorEmail ? ` por ${item.geradoPorEmail}` : ""}
                      </p>
                      {item.enviadoEm && (
                        <p className="text-[11px] text-[#2F855A]">
                          Enviado em {format(new Date(item.enviadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })} via {item.canalEnvio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#706D65] italic">Nenhuma versão anterior registrada.</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-[#100D3F] text-white hover:bg-[#1A165C] text-xs font-bold w-full"
              >
                Concluir
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
