import { useState } from "react";
import { OrdemServico, Cliente, Tecnico, Gasto, Interacao, Manutencao } from "@/hooks/use-crm";
import {
  calcularFinanceiroOS,
  formatCurrency,
  formatPercent,
  validarCancelamentoOrdem,
  ORDENS_STATUS_LIST,
  OrdemStatus,
} from "@/lib/ordens-servico";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Calendar,
  Clock,
  User,
  MapPin,
  DollarSign,
  History,
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrdemServicoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordem: OrdemServico | null;
  cliente?: Cliente | null | undefined;
  tecnico?: Tecnico | null | undefined;
  gastosOS: Gasto[];
  interacoesOS: Interacao[];
  manutencoesOS: Manutencao[];
  userRole?: string; // 'admin' | 'financeiro' | 'atendente' | 'tecnico'
  onRefreshData: () => void;
  onUpdateStatus: (ordem: OrdemServico, novoStatus: OrdemStatus, motivoCancelamento?: string) => Promise<void>;
  onUpdateFinanceiro: (ordem: OrdemServico, financeiro: { valor_orcado: number; valor_aprovado: number; valor_recebido: number; situacao_pagamento: string }) => Promise<void>;
}

export function OrdemServicoDetalhesDialog({
  open,
  onOpenChange,
  ordem,
  cliente,
  tecnico,
  gastosOS,
  interacoesOS,
  manutencoesOS,
  userRole = "admin",
  onRefreshData,
  onUpdateStatus,
  onUpdateFinanceiro,
}: OrdemServicoDetalhesDialogProps) {
  if (!ordem) return null;

  const isAtendente = userRole === "atendente";
  const [activeTab, setActiveTab] = useState("geral");

  // Estado dos campos financeiros
  const [valorOrcado, setValorOrcado] = useState(ordem.valor_orcado || 0);
  const [valorAprovado, setValorAprovado] = useState(ordem.valor_aprovado || 0);
  const [valorRecebido, setValorRecebido] = useState(ordem.valor_recebido || 0);
  const [situacaoPagamento, setSituacaoPagamento] = useState(ordem.situacao_pagamento || "Pendente");
  const [salvandoFinanceiro, setSalvandoFinanceiro] = useState(false);

  // Modal de Cancelamento
  const [modalCancelamentoOpen, setModalCancelamentoOpen] = useState(false);
  const [motivoCancelamentoInput, setMotivoCancelamentoInput] = useState("");

  // Modal de Adição de Gasto
  const [modalGastoOpen, setModalGastoOpen] = useState(false);
  const [gastoDescricao, setGastoDescricao] = useState("");
  const [gastoCategoria, setGastoCategoria] = useState("Materiais");
  const [gastoValor, setGastoValor] = useState("");

  // Cálculo financeiro dinâmico
  const financeiroCalculado = calcularFinanceiroOS({
    valorOrcado,
    valorAprovado,
    valorRecebido,
    gastos: gastosOS.map((g) => ({ categoria: g.categoria, valor: g.valor })),
  });

  const handleSalvarFinanceiro = async () => {
    if (isAtendente) {
      toast.error("Usuários com perfil Atendente não podem alterar os valores financeiros diretamente.");
      return;
    }
    try {
      setSalvandoFinanceiro(true);
      await onUpdateFinanceiro(ordem, {
        valor_orcado: Number(valorOrcado) || 0,
        valor_aprovado: Number(valorAprovado) || 0,
        valor_recebido: Number(valorRecebido) || 0,
        situacao_pagamento: situacaoPagamento,
      });
      toast.success("Dados financeiros atualizados com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar dados financeiros.");
    } finally {
      setSalvandoFinanceiro(false);
    }
  };

  const handleStatusChange = async (novoStatus: OrdemStatus) => {
    if (novoStatus === "Cancelada") {
      setModalCancelamentoOpen(true);
      return;
    }
    try {
      await onUpdateStatus(ordem, novoStatus);
      toast.success(`Status atualizado para ${novoStatus}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar status.");
    }
  };

  const handleConfirmarCancelamento = async () => {
    const validacao = validarCancelamentoOrdem("Cancelada", motivoCancelamentoInput);
    if (!validacao.valido) {
      toast.error(validacao.erro);
      return;
    }
    try {
      await onUpdateStatus(ordem, "Cancelada", motivoCancelamentoInput);
      setModalCancelamentoOpen(false);
      setMotivoCancelamentoInput("");
      toast.success("Ordem de serviço cancelada com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao cancelar ordem.");
    }
  };

  const handleAdicionarGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoDescricao.trim() || !gastoValor) {
      toast.error("Informe a descrição e o valor do gasto.");
      return;
    }

    try {
      const valorNum = parseFloat(gastoValor.replace(",", "."));
      if (isNaN(valorNum) || valorNum <= 0) {
        toast.error("Informe um valor válido maior que zero.");
        return;
      }

      const { error } = await supabase.from("gastos").insert({
        ordem_servico_id: ordem.id,
        cliente_id: ordem.cliente_id,
        tecnico_id: ordem.tecnico_id,
        categoria: gastoCategoria,
        descricao: gastoDescricao,
        valor: valorNum,
        data: new Date().toISOString().split("T")[0],
        tipo: "Operacional",
      } as any);

      if (error) throw error;

      toast.success("Gasto vinculado à Ordem de Serviço!");
      setModalGastoOpen(false);
      setGastoDescricao("");
      setGastoValor("");
      onRefreshData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao vincular gasto.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {ordem.codigo}
              </span>
              <DialogTitle className="text-lg font-bold">
                {cliente?.nome || "Cliente não encontrado"}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              {/* Dropdown de Mudança de Status */}
              <Select
                value={ordem.status}
                onValueChange={(v) => handleStatusChange(v as OrdemStatus)}
              >
                <SelectTrigger className="w-44 h-8 text-xs font-semibold">
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

          <DialogDescription className="text-xs flex items-center gap-3 pt-1 text-slate-500">
            <span>Criado em: {new Date(ordem.created_at).toLocaleDateString("pt-BR")}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
              <Clock className="h-3 w-3" /> AUVO: Integração pendente
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geral" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">
              <History className="h-3.5 w-3.5 mr-1.5" /> Linha do Tempo
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs">
              <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Custos & Financeiro
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DADOS GERAIS */}
          <TabsContent value="geral" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] text-slate-500 block">Técnico Responsável</span>
                <span className="text-sm font-semibold flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {tecnico?.nome || "Sem técnico atrelado"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Data e Horário Previstos</span>
                <span className="text-sm font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {new Date(ordem.data_prevista + "T00:00:00").toLocaleDateString("pt-BR")}{" "}
                  {ordem.horario_inicio ? `às ${ordem.horario_inicio}` : ""}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Tipo & Prioridade</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Badge variant="outline" className="text-xs">
                    {ordem.tipo_atendimento}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-bold">
                    {ordem.prioridade}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Endereço da Visita</span>
                <p className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200 pt-0.5">
                  <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  {ordem.endereco_visita}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 block">Descrição do Problema</span>
                <p className="p-2.5 bg-white dark:bg-slate-950 rounded-md border text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-line">
                  {ordem.descricao_problema}
                </p>
              </div>

              {ordem.servico_solicitado && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Serviço Solicitado</span>
                  <p className="p-2 bg-white dark:bg-slate-950 rounded-md border text-slate-700 dark:text-slate-300 mt-1">
                    {ordem.servico_solicitado}
                  </p>
                </div>
              )}

              {ordem.observacoes_internas && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 block">Observações Internas</span>
                  <p className="p-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md text-amber-900 dark:text-amber-200 mt-1 text-xs">
                    {ordem.observacoes_internas}
                  </p>
                </div>
              )}

              {ordem.status === "Cancelada" && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-md text-rose-900 dark:text-rose-200">
                  <span className="font-bold block text-xs">Motivo do Cancelamento:</span>
                  <p className="text-xs mt-0.5">{ordem.motivo_cancelamento || "Sem motivo especificado"}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: LINHA DO TEMPO & HISTÓRICO */}
          <TabsContent value="timeline" className="space-y-4 pt-3">
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Histórico & Eventos da Ordem
              </h4>

              <div className="border-l-2 border-blue-500 pl-4 space-y-4">
                {/* Evento de Criação */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-950" />
                  <span className="text-xs text-slate-400 block">
                    {new Date(ordem.created_at).toLocaleString("pt-BR")}
                  </span>
                  <span className="font-semibold text-sm">Ordem de Serviço criada</span>
                  <p className="text-xs text-slate-500">Status inicial: {ordem.status}</p>
                </div>

                {/* Manutenções Vinculadas */}
                {manutencoesOS.map((m) => (
                  <div key={m.id} className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-950" />
                    <span className="text-xs text-slate-400 block">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </span>
                    <span className="font-semibold text-sm">Manutenção Agendada</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {m.tipo} - {m.descricao}
                    </p>
                  </div>
                ))}

                {/* Interações Vinculadas */}
                {interacoesOS.map((i) => (
                  <div key={i.id} className="relative">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-950" />
                    <span className="text-xs text-slate-400 block">
                      {new Date(i.created_at).toLocaleString("pt-BR")}
                    </span>
                    <span className="font-semibold text-sm">Interação registrada ({i.tipo})</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{i.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: CUSTOS & FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4 pt-3">
            {isAtendente && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Acesso Restrito:</strong> Seu perfil (Atendente) permite visualizar o financeiro, mas alterações de recebimentos são restritas ao setor Financeiro.
                </span>
              </div>
            )}

            {/* Widgets de Métricas da OS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardContent className="p-3">
                  <span className="text-[11px] text-slate-500 block font-medium">Custo Total</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(financeiroCalculado.custoTotal)}
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardContent className="p-3">
                  <span className="text-[11px] text-slate-500 block font-medium">Resultado Bruto</span>
                  <span
                    className={`text-base font-bold ${
                      financeiroCalculado.resultadoBruto >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(financeiroCalculado.resultadoBruto)}
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardContent className="p-3">
                  <span className="text-[11px] text-slate-500 block font-medium">Margem Percentual</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {financeiroCalculado.margemPercentual !== null
                      ? formatPercent(financeiroCalculado.margemPercentual)
                      : "0,0%"}
                  </span>
                  {financeiroCalculado.valorRecebido === 0 && (
                    <span className="text-[9px] text-slate-400 block font-medium">
                      Aguardando recebimento
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardContent className="p-3">
                  <span className="text-[11px] text-slate-500 block font-medium">Situação Pagamento</span>
                  <Badge
                    variant="outline"
                    className="mt-0.5 text-xs font-bold"
                  >
                    {financeiroCalculado.situacaoPagamento}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Inputs de Valores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="valorOrcado">Valor Orçado (R$)</Label>
                <Input
                  id="valorOrcado"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isAtendente}
                  value={valorOrcado}
                  onChange={(e) => setValorOrcado(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valorAprovado">Valor Aprovado (R$)</Label>
                <Input
                  id="valorAprovado"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isAtendente}
                  value={valorAprovado}
                  onChange={(e) => setValorAprovado(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valorRecebido">Valor Recebido (R$)</Label>
                <Input
                  id="valorRecebido"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isAtendente}
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(Number(e.target.value))}
                />
              </div>
            </div>

            {!isAtendente && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSalvarFinanceiro}
                  disabled={salvandoFinanceiro}
                >
                  {salvandoFinanceiro ? "Salvando..." : "Salvar Valores Financeiros"}
                </Button>
              </div>
            )}

            {/* Tabela de Gastos Vinculados */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Gastos e Custos Vinculados ({gastosOS.length})
                </h4>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setModalGastoOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Vincular Gasto
                </Button>
              </div>

              {gastosOS.length === 0 ? (
                <div className="text-xs text-center py-6 text-slate-400 border border-dashed rounded-md">
                  Nenhum gasto vinculado a esta ordem de serviço.
                </div>
              ) : (
                <div className="border rounded-md divide-y text-xs">
                  {gastosOS.map((g) => (
                    <div key={g.id} className="p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold block">{g.descricao}</span>
                        <span className="text-slate-400 text-[11px]">
                          {g.categoria} • {new Date(g.data).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(g.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* MODAL DE MOTIVO DE CANCELAMENTO */}
      <Dialog open={modalCancelamentoOpen} onOpenChange={setModalCancelamentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Para cancelar esta Ordem de Serviço, informe obrigatoriamente o motivo. A ordem permanecerá no histórico auditado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="motivoCancelamento">Motivo do Cancelamento *</Label>
            <Textarea
              id="motivoCancelamento"
              placeholder="Ex: Cliente desistiu da instalação / Peça indisponível no fornecedor..."
              rows={3}
              value={motivoCancelamentoInput}
              onChange={(e) => setMotivoCancelamentoInput(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalCancelamentoOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleConfirmarCancelamento}>
              Confirmar Cancelamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL ADICIONAR GASTO */}
      <Dialog open={modalGastoOpen} onOpenChange={setModalGastoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Novo Gasto</DialogTitle>
            <DialogDescription>
              Registre um custo direto associado a esta Ordem de Serviço.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdicionarGasto} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="gastoDesc">Descrição *</Label>
              <Input
                id="gastoDesc"
                placeholder="Ex: Compra de mangueiras solares"
                value={gastoDescricao}
                onChange={(e) => setGastoDescricao(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="gastoCat">Categoria</Label>
                <Select value={gastoCategoria} onValueChange={setGastoCategoria}>
                  <SelectTrigger id="gastoCat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Materiais">Materiais / Peças</SelectItem>
                    <SelectItem value="Deslocamento/Combustível">Deslocamento</SelectItem>
                    <SelectItem value="Terceiros">Serviços Terceiros</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="gastoVal">Valor (R$) *</Label>
                <Input
                  id="gastoVal"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={gastoValor}
                  onChange={(e) => setGastoValor(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalGastoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar e Vincular</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
