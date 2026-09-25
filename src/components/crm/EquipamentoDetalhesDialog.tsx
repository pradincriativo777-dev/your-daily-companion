import { useState, useEffect } from "react";
import {
  Equipamento,
  Cliente,
  EquipamentoGarantia,
  EquipamentoPlanoPreventivo,
  EquipamentoAnexo,
  OrdemServico,
} from "@/hooks/use-crm";
import {
  calcularEstadoGarantia,
  calcularProximaManutencao,
  verificarOSDuplicadaParaAlerta,
} from "@/lib/equipamentos";
import { EquipamentoGarantiaDialog } from "@/components/crm/EquipamentoGarantiaDialog";
import { EquipamentoSubstituirDialog } from "@/components/crm/EquipamentoSubstituirDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wrench,
  ShieldCheck,
  Calendar,
  FileText,
  History,
  Plus,
  Paperclip,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Lock,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EquipamentoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamento: Equipamento | null;
  cliente?: Cliente | null | undefined;
  garantias: EquipamentoGarantia[];
  planosPreventivos: EquipamentoPlanoPreventivo[];
  anexos: EquipamentoAnexo[];
  ordensServico: OrdemServico[];
  userRole?: string;
  onRefreshData: () => void;
  onEditarEquipamento: (equipamento: Equipamento) => void;
}

export function EquipamentoDetalhesDialog({
  open,
  onOpenChange,
  equipamento,
  cliente,
  garantias,
  planosPreventivos,
  anexos,
  ordensServico,
  userRole = "admin",
  onRefreshData,
  onEditarEquipamento,
}: EquipamentoDetalhesDialogProps) {
  if (!equipamento) return null;

  const [activeTab, setActiveTab] = useState("geral");

  // Modais de apoio
  const [modalGarantiaOpen, setModalGarantiaOpen] = useState(false);
  const [garantiaParaEditar, setGarantiaParaEditar] = useState<EquipamentoGarantia | null>(null);

  const [modalSubstituirOpen, setModalSubstituirOpen] = useState(false);

  // Estado para Modal de Plano Preventivo
  const [modalPlanoOpen, setModalPlanoOpen] = useState(false);
  const [planoTipo, setPlanoTipo] = useState("Limpeza e Descalcificação");
  const [planoMeses, setPlanoMeses] = useState(6);
  const [planoUltimaData, setPlanoUltimaData] = useState("");
  const [planoInstrucoes, setPlanoInstrucoes] = useState("");
  const [salvandoPlano, setSalvandoPlano] = useState(false);

  // Estado para Modal de Conclusão de Preventiva
  const [modalConcluirOpen, setModalConcluirOpen] = useState(false);
  const [planoParaConcluir, setPlanoParaConcluir] = useState<EquipamentoPlanoPreventivo | null>(null);
  const [dataExecucaoConclusao, setDataExecucaoConclusao] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [obsConclusao, setObsConclusao] = useState("");

  // Estado para Anexo Privado (Upload)
  const [modalAnexoOpen, setModalAnexoOpen] = useState(false);
  const [anexoTipo, setAnexoTipo] = useState("Foto Equipamento");
  const [anexoArquivo, setAnexoArquivo] = useState<File | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

  // URLs Assinadas Temporárias para Anexos
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    // Gerar URLs assinadas temporárias para anexos
    async function loadSignedUrls() {
      const urls: Record<string, string> = {};
      for (const a of anexos) {
        if (a.equipamento_id === equipamento?.id) {
          const { data, error } = await supabase.storage
            .from("equipamentos-anexos")
            .createSignedUrl(a.file_path, 3600); // 60 minutos

          if (data?.signedUrl) {
            urls[a.id] = data.signedUrl;
          }
        }
      }
      setSignedUrls(urls);
    }

    if (open && equipamento && anexos.length > 0) {
      loadSignedUrls();
    }
  }, [open, equipamento, anexos]);

  const handleSalvarPlanoPreventivo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSalvandoPlano(true);
      const nextDate = calcularProximaManutencao(planoUltimaData, planoMeses);

      const { error } = await (supabase.from as any)("equipamentos_planos_preventivos").insert({
        equipamento_id: equipamento.id,
        tipo_manutencao: planoTipo,
        periodicidade_meses: Number(planoMeses) || 6,
        data_ultima_manutencao: planoUltimaData || null,
        proxima_manutencao: nextDate,
        instrucoes: planoInstrucoes.trim() || null,
        status: "Ativo",
      });

      if (error) throw error;

      toast.success("Plano de manutenção preventiva cadastrado!");
      setModalPlanoOpen(false);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar plano.");
    } finally {
      setSalvandoPlano(false);
    }
  };

  const handleConcluirPreventiva = async () => {
    if (!planoParaConcluir) return;

    try {
      // 1. Registrar histórico de execução
      const { error: errHist } = await (supabase.from as any)(
        "equipamentos_historico_preventivas",
      ).insert({
        plano_id: planoParaConcluir.id,
        equipamento_id: equipamento.id,
        data_execucao: dataExecucaoConclusao,
        observacoes: obsConclusao.trim() || "Manutenção preventiva concluída com sucesso.",
      });

      if (errHist) throw errHist;

      // 2. Recalcular próxima manutenção
      const novaProximaData = calcularProximaManutencao(
        dataExecucaoConclusao,
        planoParaConcluir.periodicidade_meses,
      );

      const { error: errPlano } = await (supabase.from as any)("equipamentos_planos_preventivos")
        .update({
          data_ultima_manutencao: dataExecucaoConclusao,
          proxima_manutencao: novaProximaData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planoParaConcluir.id);

      if (errPlano) throw errPlano;

      toast.success(
        `Preventiva concluída! Próxima manutenção agendada para ${
          novaProximaData
            ? new Date(novaProximaData + "T00:00:00").toLocaleDateString("pt-BR")
            : "indefinida"
        }`,
      );

      setModalConcluirOpen(false);
      setPlanoParaConcluir(null);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao concluir preventiva.");
    }
  };

  const handleCriarOSRascunhoAlerta = async (plano: EquipamentoPlanoPreventivo) => {
    // Validação de Ordem Duplicada para o Alerta
    const jaExisteOS = verificarOSDuplicadaParaAlerta(plano.id, ordensServico);
    if (jaExisteOS) {
      toast.error("Já existe uma Ordem de Serviço em Rascunho ou Ativa para este alerta.");
      return;
    }

    try {
      const { error } = await (supabase.from as any)("ordens_servico").insert({
        cliente_id: equipamento.cliente_id,
        tipo_atendimento: "Manutenção Preventiva",
        prioridade: "Média",
        descricao_problema: `MANUTENÇÃO PREVENTIVA ALERTA: ${plano.tipo_manutencao} para o equipamento ${equipamento.marca} ${equipamento.modelo}.`,
        servico_solicitado: `Execução do plano de preventiva: ${plano.tipo_manutencao}`,
        endereco_visita: cliente?.endereco ? `${cliente.endereco}, ${cliente.cidade || ""}` : "Endereço do cliente",
        data_prevista: new Date().toISOString().split("T")[0],
        status: "Rascunho",
        origem_solicitacao: "Alerta Preventiva",
        observacoes_internas: `PLANO_ID:${plano.id} | EQUIPAMENTO_ID:${equipamento.id} | Criado automaticamente a partir de alerta preventivo vencido/próximo.`,
      });

      if (error) throw error;

      toast.success("Ordem de Serviço criada em RASCUNHO com sucesso!");
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar OS rascunho.");
    }
  };

  const handleUploadAnexo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anexoArquivo) {
      toast.error("Selecione um arquivo para anexar.");
      return;
    }

    if (anexoArquivo.size > 10 * 1024 * 1024) {
      toast.error("O arquivo excede o limite máximo de 10 MB.");
      return;
    }

    try {
      setEnviandoAnexo(true);

      const ext = anexoArquivo.name.split(".").pop();
      const pathName = `${equipamento.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      // Upload privado no Supabase Storage
      const { error: errUpload } = await supabase.storage
        .from("equipamentos-anexos")
        .upload(pathName, anexoArquivo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (errUpload) throw errUpload;

      // Inserir registro na tabela de anexos
      const { error: errAnexo } = await (supabase.from as any)("equipamentos_anexos").insert({
        equipamento_id: equipamento.id,
        tipo: anexoTipo,
        nome_arquivo: anexoArquivo.name,
        file_path: pathName,
        file_size_bytes: anexoArquivo.size,
        mime_type: anexoArquivo.type,
      });

      if (errAnexo) throw errAnexo;

      // Auditoria
      await (supabase.from as any)("equipamentos_auditoria").insert({
        equipamento_id: equipamento.id,
        acao: "UPLOAD_ANEXO",
        detalhes: {
          nome_arquivo: anexoArquivo.name,
          tipo: anexoTipo,
          tamanho_bytes: anexoArquivo.size,
        },
      });

      toast.success("Arquivo anexado com sucesso!");
      setModalAnexoOpen(false);
      setAnexoArquivo(null);
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload do anexo.");
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const handleRemoverAnexo = async (anexo: EquipamentoAnexo) => {
    if (!confirm(`Tem certeza que deseja remover o anexo "${anexo.nome_arquivo}"?`)) {
      return;
    }

    try {
      // Deletar do Storage
      await supabase.storage.from("equipamentos-anexos").remove([anexo.file_path]);

      // Deletar do banco
      await (supabase.from as any)("equipamentos_anexos").delete().eq("id", anexo.id);

      // Registrar auditoria
      await (supabase.from as any)("equipamentos_auditoria").insert({
        equipamento_id: equipamento.id,
        acao: "REMOÇÃO_ANEXO",
        detalhes: {
          nome_arquivo: anexo.nome_arquivo,
          tipo: anexo.tipo,
        },
      });

      toast.success("Anexo removido.");
      onRefreshData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover anexo.");
    }
  };

  const garantiasDoEquipamento = garantias.filter((g) => g.equipamento_id === equipamento.id);
  const planosDoEquipamento = planosPreventivos.filter((p) => p.equipamento_id === equipamento.id);
  const anexosDoEquipamento = anexos.filter((a) => a.equipamento_id === equipamento.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs uppercase bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                {equipamento.categoria}
              </Badge>
              <DialogTitle className="text-lg font-bold">
                {equipamento.marca} {equipamento.modelo}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs font-bold ${
                  equipamento.estado === "Ativo"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : equipamento.estado === "Em manutenção"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {equipamento.estado}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onEditarEquipamento(equipamento)}
              >
                Editar
              </Button>

              {userRole === "admin" && equipamento.estado === "Ativo" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setModalSubstituirOpen(true)}
                >
                  Substituir
                </Button>
              )}
            </div>
          </div>

          <DialogDescription className="text-xs text-slate-500 pt-1">
            Cliente: <strong>{cliente?.nome || "Não informado"}</strong> • {equipamento.local_instalacao || "Local não informado"}{" "}
            {equipamento.numero_serie ? `• Nº de Série: ${equipamento.numero_serie}` : ""}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="garantias" className="text-xs">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Garantias ({garantiasDoEquipamento.length})
            </TabsTrigger>
            <TabsTrigger value="preventivas" className="text-xs">
              <Wrench className="h-3.5 w-3.5 mr-1" /> Preventivas ({planosDoEquipamento.length})
            </TabsTrigger>
            <TabsTrigger value="anexos" className="text-xs">
              <Paperclip className="h-3.5 w-3.5 mr-1" /> Anexos ({anexosDoEquipamento.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VISÃO GERAL */}
          <TabsContent value="geral" className="space-y-4 pt-3 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
              <div>
                <span className="text-slate-400 block">Quantidade</span>
                <span className="font-bold text-sm">{equipamento.quantidade} un.</span>
              </div>
              <div>
                <span className="text-slate-400 block">Data de Instalação</span>
                <span className="font-bold text-sm">
                  {equipamento.data_instalacao
                    ? new Date(equipamento.data_instalacao + "T00:00:00").toLocaleDateString("pt-BR")
                    : "Não informada"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Empresa Responsável</span>
                <span className="font-bold text-sm">
                  {equipamento.empresa_responsavel_instalacao || "Não informada"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Local de Instalação</span>
                <span className="font-bold text-sm">{equipamento.local_instalacao || "Telhado"}</span>
              </div>
            </div>

            {equipamento.observacoes_tecnicas && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">Observações Técnicas</span>
                <p className="p-3 bg-white dark:bg-slate-950 border rounded-md text-slate-700 dark:text-slate-300">
                  {equipamento.observacoes_tecnicas}
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: GARANTIAS */}
          <TabsContent value="garantias" className="space-y-4 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-slate-500">
                Garantias Cadastradas
              </h4>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  setGarantiaParaEditar(null);
                  setModalGarantiaOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova Garantia
              </Button>
            </div>

            {garantiasDoEquipamento.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border border-dashed rounded-md">
                Nenhuma garantia cadastrada para este equipamento.
              </div>
            ) : (
              <div className="space-y-3">
                {garantiasDoEquipamento.map((g) => {
                  const estadoCalc = calcularEstadoGarantia({
                    dataTermino: g.data_termino,
                  });

                  return (
                    <Card key={g.id} className="border border-slate-200 dark:border-slate-800">
                      <CardContent className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{g.tipo}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                estadoCalc === "Vigente"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                  : estadoCalc === "Próxima do vencimento"
                                  ? "bg-amber-50 text-amber-600 border-amber-200"
                                  : estadoCalc === "Vencida"
                                  ? "bg-rose-50 text-rose-600 border-rose-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {estadoCalc}
                            </Badge>
                          </div>

                          <p className="text-slate-500">
                            Responsável: <strong>{g.responsavel || "Não informado"}</strong> • Início:{" "}
                            {g.data_inicio
                              ? new Date(g.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")
                              : "N/A"}{" "}
                            • Término:{" "}
                            {g.data_termino
                              ? new Date(g.data_termino + "T00:00:00").toLocaleDateString("pt-BR")
                              : "Sem data final"}
                          </p>

                          {g.descricao_cobertura && (
                            <p className="text-slate-600 dark:text-slate-300 italic pt-0.5">
                              "{g.descricao_cobertura}"
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => {
                            setGarantiaParaEditar(g);
                            setModalGarantiaOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: MANUTENÇÃO PREVENTIVA */}
          <TabsContent value="preventivas" className="space-y-4 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-slate-500">
                Planos de Manutenção Preventiva
              </h4>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setModalPlanoOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Novo Plano Preventivo
              </Button>
            </div>

            {planosDoEquipamento.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border border-dashed rounded-md">
                Nenhum plano preventivo configurado para este equipamento.
              </div>
            ) : (
              <div className="space-y-3">
                {planosDoEquipamento.map((p) => {
                  const dtProx = p.proxima_manutencao
                    ? new Date(p.proxima_manutencao + "T00:00:00")
                    : null;
                  const isVencido = dtProx && dtProx < new Date();

                  return (
                    <Card key={p.id} className="border border-slate-200 dark:border-slate-800">
                      <CardContent className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{p.tipo_manutencao}</span>
                            <Badge variant="outline" className="text-[10px]">
                              A cada {p.periodicidade_meses} meses
                            </Badge>
                            {isVencido && (
                              <Badge variant="destructive" className="text-[10px]">
                                Manutenção Vencida
                              </Badge>
                            )}
                          </div>

                          <p className="text-slate-500">
                            Última execução:{" "}
                            {p.data_ultima_manutencao
                              ? new Date(p.data_ultima_manutencao + "T00:00:00").toLocaleDateString(
                                  "pt-BR",
                                )
                              : "Nenhuma"}{" "}
                            • Próxima data:{" "}
                            <strong>
                              {p.proxima_manutencao
                                ? new Date(p.proxima_manutencao + "T00:00:00").toLocaleDateString(
                                    "pt-BR",
                                  )
                                : "Sem data calculada"}
                            </strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isVencido && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs bg-amber-100 text-amber-800 hover:bg-amber-200"
                              onClick={() => handleCriarOSRascunhoAlerta(p)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> OS Rascunho
                            </Button>
                          )}

                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setPlanoParaConcluir(p);
                              setModalConcluirOpen(true);
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir Preventiva
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: ANEXOS PRIVADOS (FOTOS E DOCUMENTOS) */}
          <TabsContent value="anexos" className="space-y-4 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-slate-500">
                Fotos e Documentos Anexados (Armazenamento Privado)
              </h4>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setModalAnexoOpen(true)}
              >
                <Paperclip className="h-3.5 w-3.5 mr-1" /> Anexar Arquivo
              </Button>
            </div>

            {anexosDoEquipamento.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border border-dashed rounded-md">
                Nenhum foto ou documento privado anexado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {anexosDoEquipamento.map((a) => {
                  const urlAssinada = signedUrls[a.id];

                  return (
                    <Card key={a.id} className="border p-3 flex items-center justify-between gap-3">
                      <div className="space-y-1 truncate">
                        <span className="font-bold block truncate">{a.nome_arquivo}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {a.tipo}
                        </Badge>
                        <span className="text-[10px] text-slate-400 block">
                          {(a.file_size_bytes / 1024).toFixed(1)} KB •{" "}
                          {new Date(a.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {urlAssinada && (
                          <a
                            href={urlAssinada}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                          >
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                          </a>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700"
                          onClick={() => handleRemoverAnexo(a)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* MODAL NOVO PLANO PREVENTIVO */}
      <Dialog open={modalPlanoOpen} onOpenChange={setModalPlanoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Plano de Manutenção Preventiva</DialogTitle>
            <DialogDescription>
              Configure a periodicidade da manutenção preventiva deste equipamento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarPlanoPreventivo} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="planoTipo">Tipo de Manutenção *</Label>
              <Input
                id="planoTipo"
                placeholder="Ex: Limpeza de placas e verificação de tubos"
                value={planoTipo}
                onChange={(e) => setPlanoTipo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="planoMeses">Periodicidade (Meses) *</Label>
                <Input
                  id="planoMeses"
                  type="number"
                  min={1}
                  value={planoMeses}
                  onChange={(e) => setPlanoMeses(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="planoUltimaData">Última Execução (Opcional)</Label>
                <Input
                  id="planoUltimaData"
                  type="date"
                  value={planoUltimaData}
                  onChange={(e) => setPlanoUltimaData(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="planoInstrucoes">Instruções Técnicas</Label>
              <Textarea
                id="planoInstrucoes"
                placeholder="Passos de verificação, pressão recomendada, torque..."
                rows={2}
                value={planoInstrucoes}
                onChange={(e) => setPlanoInstrucoes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalPlanoOpen(false)}
                disabled={salvandoPlano}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoPlano}>
                {salvandoPlano ? "Salvação..." : "Criar Plano"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL CONCLUIR PREVENTIVA */}
      <Dialog open={modalConcluirOpen} onOpenChange={setModalConcluirOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir Manutenção Preventiva</DialogTitle>
            <DialogDescription>
              Registre a data de conclusão. A próxima manutenção será calculada automaticamente a partir desta data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="dataExec">Data da Execução *</Label>
              <Input
                id="dataExec"
                type="date"
                value={dataExecucaoConclusao}
                onChange={(e) => setDataExecucaoConclusao(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="obsExec">Observações da Manutenção</Label>
              <Textarea
                id="obsExec"
                placeholder="Resumo dos testes efetuados, condições encontradas..."
                rows={2}
                value={obsConclusao}
                onChange={(e) => setObsConclusao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConcluirOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConcluirPreventiva}>Registrar Conclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL UPLOAD ANEXO */}
      <Dialog open={modalAnexoOpen} onOpenChange={setModalAnexoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anexar Foto ou Documento</DialogTitle>
            <DialogDescription>
              Upload privado (limite 10 MB). Os arquivos só ficam visíveis via URLs temporárias assinadas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadAnexo} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="anexoTipo">Tipo do Anexo *</Label>
              <Select value={anexoTipo} onValueChange={setAnexoTipo}>
                <SelectTrigger id="anexoTipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Foto Equipamento">Foto do Equipamento</SelectItem>
                  <SelectItem value="Etiqueta / Nº Série">Etiqueta / Nº de Série</SelectItem>
                  <SelectItem value="Nota Fiscal">Nota Fiscal</SelectItem>
                  <SelectItem value="Certificado Garantia">Certificado de Garantia</SelectItem>
                  <SelectItem value="Manual">Manual Técnico</SelectItem>
                  <SelectItem value="Comprovante Instalação">Comprovante de Instalação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="arquivo">Arquivo (PDF ou Imagem) *</Label>
              <Input
                id="arquivo"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setAnexoArquivo(e.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAnexoOpen(false)}
                disabled={enviandoAnexo}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={enviandoAnexo}>
                {enviandoAnexo ? "Enviando..." : "Enviar Anexo Privado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SUBSTITUIR */}
      <EquipamentoSubstituirDialog
        open={modalSubstituirOpen}
        onOpenChange={setModalSubstituirOpen}
        equipamentoAntigo={equipamento}
        userRole={userRole}
        onSuccess={onRefreshData}
      />

      {/* MODAL GARANTIA */}
      <EquipamentoGarantiaDialog
        open={modalGarantiaOpen}
        onOpenChange={setModalGarantiaOpen}
        equipamentoId={equipamento.id}
        garantiaParaEditar={garantiaParaEditar}
        onSuccess={onRefreshData}
      />
    </Dialog>
  );
}
