import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Download, TrendingDown, TrendingUp, Clock, MessageCircle, AlertTriangle, ThumbsUp, PieChart, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Loading, PageHeader, Pagination } from "@/components/crm/ui";
import { formatCurrency, formatDate, num } from "@/lib/crm";
import { useClientes, useGastos, useOrdensServico, type OrdemServico, type Cliente } from "@/hooks/use-crm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/financeiro")({
  head: () => ({
    meta: [
      { title: "Painel Financeiro · JANSOL Admin" },
      { name: "description", content: "Visão executiva financeira." },
    ],
  }),
  component: FinanceiroPage,
});

const PAGE_SIZE = 15;

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function formatPhone(phone: string | null) {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

function FinanceiroPage() {
  const { data: gastos = [], isLoading: loadGastos } = useGastos();
  const { data: ordens = [], isLoading: loadOrdens, refetch: refetchOrdens } = useOrdensServico();
  const { data: clientes = [], isLoading: loadClientes } = useClientes();

  const [de, setDe] = useState(firstDayOfMonth());
  const [ate, setAte] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"receber" | "rentabilidade">("receber");
  const [pagamentoDialog, setPagamentoDialog] = useState<OrdemServico | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  const getCliente = (id: string): Cliente | undefined => clientes.find((c) => c.id === id);
  const nomeCliente = (id: string) => getCliente(id)?.nome ?? "—";

  // KPIs
  const gastosPeriodo = gastos.filter((g) => g.data >= de && g.data <= ate);
  const totalDespesas = gastosPeriodo.reduce((sum, g) => sum + num(g.valor), 0);

  const ordensPeriodo = ordens.filter(
    (o) => o.created_at.slice(0, 10) >= de && o.created_at.slice(0, 10) <= ate
  );

  const totalReceita = ordensPeriodo.reduce((sum, o) => sum + num(o.valor_recebido), 0);
  const contasAReceber = ordens.reduce((sum, o) => {
    const saldo = num(o.valor_aprovado) - num(o.valor_recebido);
    return saldo > 0 ? sum + saldo : sum;
  }, 0);

  const lucroLiquido = totalReceita - totalDespesas;

  // 1. Termômetro da Saúde (Farol Financeiro)
  const saudePerc = totalReceita > 0 ? (totalDespesas / totalReceita) * 100 : (totalDespesas > 0 ? 100 : 0);
  let saudeStatus = { cor: "bg-emerald-500", textoCor: "text-emerald-700", bgCor: "bg-emerald-50", icone: ThumbsUp, msg: "Excelente! Empresa altamente lucrativa.", perigo: false };
  
  if (saudePerc > 50 && saudePerc <= 80) {
    saudeStatus = { cor: "bg-amber-500", textoCor: "text-amber-700", bgCor: "bg-amber-50", icone: AlertTriangle, msg: "Atenção: Os custos estão consumindo boa parte do que você ganha. Segure os gastos extras.", perigo: false };
  } else if (saudePerc > 80 || totalDespesas > totalReceita) {
    saudeStatus = { cor: "bg-rose-500", textoCor: "text-rose-700", bgCor: "bg-rose-50", icone: TrendingDown, msg: "Perigo: Você está trabalhando para pagar conta (Risco de Prejuízo).", perigo: true };
  }
  if (totalReceita === 0 && totalDespesas === 0) {
    saudeStatus = { cor: "bg-stone-300", textoCor: "text-stone-600", bgCor: "bg-stone-50", icone: Activity, msg: "Sem movimentação no período.", perigo: false };
  }

  // 2. Raio-X de Custos
  const categoriasGasto = useMemo(() => {
    const mapa = new Map<string, number>();
    gastosPeriodo.forEach(g => {
      mapa.set(g.categoria, (mapa.get(g.categoria) || 0) + num(g.valor));
    });
    return Array.from(mapa.entries())
      .map(([cat, val]) => ({ categoria: cat, valor: val, perc: totalDespesas > 0 ? (val / totalDespesas) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5); // Top 5
  }, [gastosPeriodo, totalDespesas]);

  // Tabelas
  const ordensPendentes = useMemo(() => {
    return ordens
      .filter((o) => num(o.valor_aprovado) > num(o.valor_recebido) && o.situacao_pagamento !== "Pago")
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [ordens]);

  const ordensRentabilidade = useMemo(() => {
    return ordensPeriodo
      .filter((o) => num(o.valor_aprovado) > 0)
      .map((o) => {
        const gastosDaOrdem = gastos.filter((g) => g.ordem_servico_id === o.id);
        const custoTotal = gastosDaOrdem.reduce((s, g) => s + num(g.valor), 0);
        const lucro = num(o.valor_recebido) - custoTotal;
        const margem = num(o.valor_recebido) > 0 ? (lucro / num(o.valor_recebido)) * 100 : 0;
        return { ...o, custoTotal, lucro, margem };
      })
      .sort((a, b) => b.margem - a.margem);
  }, [ordensPeriodo, gastos]);

  const displayedList = tab === "receber" ? ordensPendentes : ordensRentabilidade;
  const pageCount = Math.ceil(displayedList.length / PAGE_SIZE);
  const pageItems = displayedList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleBaixarPagamento() {
    if (!pagamentoDialog) return;
    setSalvandoPagamento(true);
    try {
      const vPagamento = num(valorPagamento);
      const novoRecebido = num(pagamentoDialog.valor_recebido) + vPagamento;
      const situacao = novoRecebido >= num(pagamentoDialog.valor_aprovado) ? "Pago" : "Parcial";

      const { error } = await supabase
        .from("ordens_servico")
        .update({
          valor_recebido: novoRecebido,
          situacao_pagamento: situacao,
        })
        .eq("id", pagamentoDialog.id);

      if (error) throw error;
      toast.success("Pagamento registrado com sucesso!");
      refetchOrdens();
      setPagamentoDialog(null);
      setValorPagamento("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao registrar pagamento");
    } finally {
      setSalvandoPagamento(false);
    }
  }

  function abrirWhatsAppCobranca(ordem: OrdemServico, cliente: Cliente | undefined, saldo: number) {
    const zap = formatPhone(cliente?.whatsapp || cliente?.telefone || "");
    if (!zap) {
      toast.error("Cliente não possui telefone cadastrado para WhatsApp.");
      return;
    }
    const texto = `Olá ${cliente?.nome.split(" ")[0]}, tudo bem? Aqui é da JANSOL.\n\nConsta no nosso sistema um saldo em aberto de *${formatCurrency(saldo)}* referente à OS *${ordem.codigo}*.\n\nPodemos combinar o acerto para esta semana?`;
    window.open(`https://wa.me/55${zap}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  if (loadGastos || loadOrdens || loadClientes) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Painel Executivo do Proprietário"
        description="Termômetro da empresa, Raio-X de custos e Cobranças com 1 clique."
      >
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="mr-1.5 h-4 w-4" /> Exportar PDF
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs text-[#706D65]">Período (De)</Label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="bg-white border-[#E2DDD0]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[#706D65]">Período (Até)</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="bg-white border-[#E2DDD0]" />
        </div>
      </div>

      {/* NOVO: Termômetro da Saúde */}
      <Card className={`mb-6 border border-[#E2DDD0] shadow-sm ${saudeStatus.bgCor}`}>
        <CardContent className="p-5 flex items-start sm:items-center flex-col sm:flex-row gap-4">
          <div className={`p-3 rounded-full ${saudeStatus.perigo ? "bg-rose-100" : "bg-white"} border border-[#E2DDD0] shrink-0`}>
            <saudeStatus.icone className={`h-8 w-8 ${saudeStatus.textoCor}`} />
          </div>
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-bold text-lg ${saudeStatus.textoCor}`}>Termômetro da Saúde Financeira</h3>
                <p className={`text-sm ${saudeStatus.textoCor} font-medium`}>{saudeStatus.msg}</p>
              </div>
              <div className="text-right hidden sm:block">
                <span className={`text-xl font-bold ${saudeStatus.textoCor}`}>{Math.min(saudePerc, 100).toFixed(1)}%</span>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Despesas vs Receita</p>
              </div>
            </div>
            <Progress value={Math.min(saudePerc, 100)} indicatorColor={saudeStatus.cor} className="h-2.5 bg-stone-200/60" />
            <div className="sm:hidden mt-1">
              <span className={`text-sm font-bold ${saudeStatus.textoCor}`}>Comprometimento: {Math.min(saudePerc, 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        {/* KPIs (3 Colunas na grade grande) */}
        <div className="lg:col-span-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-[#E2DDD0] shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                A Receber (Na Rua)
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(contasAReceber)}</div>
              <p className="text-xs text-muted-foreground mt-1">Saldo pendente global</p>
            </CardContent>
          </Card>
          
          <Card className="border-[#E2DDD0] shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Receita Realizada
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceita)}</div>
              <p className="text-xs text-muted-foreground mt-1">Dinheiro no caixa (Mês)</p>
            </CardContent>
          </Card>

          <Card className="border-[#E2DDD0] shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Despesas Totais
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalDespesas)}</div>
              <p className="text-xs text-muted-foreground mt-1">Custos lançados (Mês)</p>
            </CardContent>
          </Card>

          <Card className={`border-[#E2DDD0] shadow-sm ${lucroLiquido >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Lucro Líquido
              </CardTitle>
              <DollarSign className={`h-4 w-4 ${lucroLiquido >= 0 ? "text-emerald-700" : "text-rose-700"}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-2xl font-bold ${lucroLiquido >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCurrency(lucroLiquido)}
              </div>
              <p className={`text-xs mt-1 ${lucroLiquido >= 0 ? "text-emerald-700/80" : "text-rose-700/80"}`}>
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* NOVO: Raio-X de Custos Invisíveis */}
        <Card className="border-[#E2DDD0] shadow-sm bg-white lg:col-span-1">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-1.5">
              <PieChart className="h-4 w-4" /> Raio-X de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {categoriasGasto.length === 0 ? (
              <div className="text-xs text-muted-foreground">Sem gastos no período.</div>
            ) : (
              categoriasGasto.map((cat) => (
                <div key={cat.categoria} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">{cat.categoria}</span>
                    <span className="text-muted-foreground">{formatCurrency(cat.valor)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={cat.perc} className="h-1.5 bg-stone-100 flex-1" indicatorColor="bg-rose-500" />
                    <span className="text-[10px] font-bold text-stone-500 w-8 text-right">{cat.perc.toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === "receber" ? "default" : "outline"}
          onClick={() => { setTab("receber"); setPage(1); }}
          className={tab === "receber" ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600" : "border-amber-200 text-amber-700 hover:bg-amber-50"}
        >
          Cobranças e Recebíveis ({ordensPendentes.length})
        </Button>
        <Button
          variant={tab === "rentabilidade" ? "default" : "outline"}
          onClick={() => { setTab("rentabilidade"); setPage(1); }}
          className={tab === "rentabilidade" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}
        >
          Rentabilidade por OS
        </Button>
      </div>

      <Card className="border-0 shadow-none bg-transparent">
        {pageItems.length === 0 ? (
          <EmptyState title="Tudo tranquilo por aqui!" description={tab === "receber" ? "Nenhum cliente devendo." : "Nenhuma ordem finalizada no período."} />
        ) : (
          <div className="bg-white border border-[#E2DDD0] rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F8F6F1] text-[11px] uppercase tracking-wider text-stone-500 font-semibold border-b border-[#E2DDD0]">
                  <TableHead>Data OS</TableHead>
                  <TableHead>OS / Cliente</TableHead>
                  {tab === "receber" ? (
                    <>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aprovado</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                      <TableHead className="text-right">Na Rua</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right">Receita (R$)</TableHead>
                      <TableHead className="text-right">Custos (R$)</TableHead>
                      <TableHead className="text-right">Lucro OS</TableHead>
                      <TableHead className="text-right">Margem %</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((item: any) => {
                  if (tab === "receber") {
                    const o = item as OrdemServico;
                    const cliente = getCliente(o.cliente_id);
                    const saldo = num(o.valor_aprovado) - num(o.valor_recebido);
                    return (
                      <TableRow key={o.id} className="text-xs border-b border-[#E2DDD0] hover:bg-stone-50">
                        <TableCell className="text-stone-600">{formatDate(o.created_at)}</TableCell>
                        <TableCell>
                          <div className="font-bold text-stone-800">{o.codigo}</div>
                          <div className="text-muted-foreground truncate max-w-[200px]">
                            {cliente?.nome ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={o.situacao_pagamento === "Parcial" ? "bg-amber-100 border-amber-200 text-amber-800" : "bg-rose-100 border-rose-200 text-rose-800"}>
                            {o.situacao_pagamento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-stone-600">{formatCurrency(o.valor_aprovado)}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">{formatCurrency(o.valor_recebido)}</TableCell>
                        <TableCell className="text-right font-bold text-rose-600 text-sm">{formatCurrency(saldo)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* NOVO: Botão de Cobrar por WhatsApp */}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-[11px] border-emerald-600 text-emerald-700 hover:bg-emerald-50 bg-white" 
                              onClick={() => abrirWhatsAppCobranca(o, cliente, saldo)}
                              title="Cobrar pelo WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1" />
                              Cobrar
                            </Button>
                            
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-[11px] border-amber-600 text-amber-700 hover:bg-amber-50 bg-white" 
                              onClick={() => {
                                setPagamentoDialog(o);
                                setValorPagamento(saldo.toString());
                              }}
                            >
                              Baixar Pgto
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    const r = item as (OrdemServico & { custoTotal: number; lucro: number; margem: number });
                    return (
                      <TableRow key={r.id} className="text-xs border-b border-[#E2DDD0] hover:bg-stone-50">
                        <TableCell className="text-stone-600">{formatDate(r.created_at)}</TableCell>
                        <TableCell>
                          <div className="font-bold text-stone-800">{r.codigo}</div>
                          <div className="text-muted-foreground truncate max-w-[200px]">
                            {nomeCliente(r.cliente_id)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-bold">{formatCurrency(r.valor_recebido)}</TableCell>
                        <TableCell className="text-right text-rose-600 font-medium">{formatCurrency(r.custoTotal)}</TableCell>
                        <TableCell className="text-right font-bold text-stone-800">{formatCurrency(r.lucro)}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={r.margem >= 40 ? "bg-emerald-500 hover:bg-emerald-600 text-white" : r.margem >= 20 ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}>
                            {r.margem.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  }
                })}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-[#E2DDD0]">
              <Pagination page={page} pageCount={pageCount} total={displayedList.length} onPage={setPage} />
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!pagamentoDialog} onOpenChange={(o) => !o && setPagamentoDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
            <DialogDescription>
              Ordem de Serviço: <strong className="text-foreground">{pagamentoDialog?.codigo}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-md border">
              <div>
                <p className="text-muted-foreground">Valor Aprovado</p>
                <p className="font-semibold text-lg">{formatCurrency(pagamentoDialog?.valor_aprovado)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Já Recebido</p>
                <p className="font-semibold text-lg text-emerald-600">{formatCurrency(pagamentoDialog?.valor_recebido)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Qual valor está entrando agora? (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="text-lg h-12 font-medium"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
                placeholder="Ex: 500.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoDialog(null)} disabled={salvandoPagamento}>Cancelar</Button>
            <Button onClick={handleBaixarPagamento} className="bg-amber-600 hover:bg-amber-700 text-white font-bold" disabled={salvandoPagamento || !valorPagamento || num(valorPagamento) <= 0}>
              {salvandoPagamento ? "Salvando..." : "Confirmar Recebimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
