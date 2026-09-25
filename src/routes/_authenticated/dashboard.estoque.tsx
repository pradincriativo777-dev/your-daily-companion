import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useEstoqueItens,
  useEstoqueMovimentacoes,
  useEstoqueInventarios,
  useEstoqueInventarioItens,
  useOrdensServico,
  useTecnicos,
  EstoqueItem,
} from "@/hooks/use-crm";
import {
  CATEGORIAS_ESTOQUE_INICIAIS,
  calcularSaldosEstoque,
} from "@/lib/estoque";
import { EstoqueItemDialog } from "@/components/crm/EstoqueItemDialog";
import { EstoqueMovimentacaoDialog } from "@/components/crm/EstoqueMovimentacaoDialog";
import { EstoqueInventarioDialog } from "@/components/crm/EstoqueInventarioDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  History,
  ClipboardList,
  BarChart3,
  RefreshCw,
  Pencil,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/estoque")({
  component: EstoqueCentralPage,
});

function EstoqueCentralPage() {
  const { data: itens = [], refetch: refetchItens } = useEstoqueItens();
  const { data: movimentacoes = [], refetch: refetchMovimentacoes } = useEstoqueMovimentacoes();
  const { data: inventarios = [], refetch: refetchInventarios } = useEstoqueInventarios();
  const { data: ordensServico = [] } = useOrdensServico();
  const { data: tecnicos = [] } = useTecnicos();

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("all");

  const [dialogItemOpen, setDialogItemOpen] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<EstoqueItem | null>(null);

  const [dialogMovOpen, setDialogMovOpen] = useState(false);
  const [itemPreSelecionadoId, setItemPreSelecionadoId] = useState<string | undefined>(undefined);

  const [dialogInvOpen, setDialogInvOpen] = useState(false);

  const refetchAll = () => {
    refetchItens();
    refetchMovimentacoes();
    refetchInventarios();
  };

  const handleSalvarItem = async (dados: Partial<EstoqueItem>) => {
    try {
      if (dados.id) {
        const { error } = await (supabase.from as any)("estoque_itens")
          .update({
            ...dados,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dados.id);

        if (error) throw error;
        toast.success("Item de estoque atualizado com sucesso!");
      } else {
        const { error } = await (supabase.from as any)("estoque_itens").insert(dados);
        if (error) throw error;
        toast.success("Item de estoque cadastrado com sucesso!");
      }

      refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar item de estoque.");
      throw err;
    }
  };

  // Cálculos de Indicadores e Saldos em tempo real
  let valorTotalEstoque = 0;
  let totalAbaixoMinimo = 0;
  let totalZerados = 0;
  let totalReservados = 0;

  const itensComSaldos = itens.map((item) => {
    const movs = movimentacoes.filter((m) => m.item_id === item.id);
    const saldos = calcularSaldosEstoque(movs);

    const valorItem = saldos.saldoFisico * (item.custo_medio || 0);
    valorTotalEstoque += valorItem;

    if (saldos.saldoFisico <= 0) totalZerados++;
    else if (saldos.saldoFisico <= item.estoque_minimo) totalAbaixoMinimo++;

    if (saldos.saldoReservado > 0) totalReservados++;

    return {
      item,
      saldos,
      valorTotalItem: valorItem,
    };
  });

  const itensFiltrados = itensComSaldos.filter(({ item }) => {
    const term = busca.toLowerCase();
    const matchBusca =
      !busca ||
      item.nome.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.marca.toLowerCase().includes(term) ||
      item.modelo.toLowerCase().includes(term);

    const matchCat = filtroCategoria === "all" || item.categoria === filtroCategoria;

    return matchBusca && matchCat;
  });

  return (
    <div className="space-y-6 p-1 md:p-4">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#100D3F]">
            Central de Estoque & Peças
          </h1>
          <p className="text-xs text-[#706D65]">
            Gestão imutável de saldo físico, reservas para ordens de serviço e movimentações auditadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogInvOpen(true)}
          >
            <ClipboardList className="h-4 w-4 mr-1.5" /> Inventário Físico
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setItemParaEditar(null);
              setDialogItemOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Novo Item / Peça
          </Button>
        </div>
      </div>

      {/* Cards de Métricas do Estoque */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-[#E2DDD0] shadow-sm">
          <CardContent className="p-3.5">
            <span className="text-xs text-[#706D65] block font-medium">Valor Estimado do Estoque</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2DDD0] shadow-sm">
          <CardContent className="p-3.5">
            <span className="text-xs text-[#706D65] block font-medium">Abaixo do Estoque Mínimo</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {totalAbaixoMinimo} itens
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2DDD0] shadow-sm">
          <CardContent className="p-3.5">
            <span className="text-xs text-[#706D65] block font-medium">Itens Zerados</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {totalZerados} itens
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2DDD0] shadow-sm">
          <CardContent className="p-3.5">
            <span className="text-xs text-[#706D65] block font-medium">Com Reservas Ativas</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {totalReservados} itens
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal com Abas */}
      <Tabs defaultValue="itens">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="itens" className="text-xs">
            <Package className="h-3.5 w-3.5 mr-1" /> Saldo & Catálogo ({itens.length})
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="text-xs">
            <History className="h-3.5 w-3.5 mr-1" /> Livro Razão ({movimentacoes.length})
          </TabsTrigger>
          <TabsTrigger value="inventarios" className="text-xs">
            <ClipboardList className="h-3.5 w-3.5 mr-1" /> Inventários ({inventarios.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ITENS E SALDO */}
        <TabsContent value="itens" className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-[#E2DDD0] shadow-sm">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#706D65]" />
              <Input
                placeholder="Buscar por SKU, nome do produto, marca ou modelo..."
                className="pl-9 h-9 text-xs"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORIAS_ESTOQUE_INICIAIS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border-0 shadow-none overflow-hidden bg-transparent">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8F6F1] text-xs border-b border-[#E2DDD0]">
                    <TableHead className="font-bold">SKU</TableHead>
                    <TableHead className="font-bold">Item / Especificação</TableHead>
                    <TableHead className="font-bold">Categoria</TableHead>
                    <TableHead className="font-bold text-center">Físico</TableHead>
                    <TableHead className="font-bold text-center">Reservado</TableHead>
                    <TableHead className="font-bold text-center">Disponível</TableHead>
                    <TableHead className="font-bold text-right">Custo Médio</TableHead>
                    <TableHead className="font-bold text-center">Situação</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-slate-400 text-xs">
                        Nenhum item de estoque encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itensFiltrados.map(({ item, saldos }) => {
                      const isZerado = saldos.saldoFisico <= 0;
                      const isAbaixoMin = saldos.saldoFisico <= item.estoque_minimo && !isZerado;

                      return (
                        <TableRow key={item.id} className="text-xs hover:bg-[#FAF5E8]/60 border-b border-[#E2DDD0]">
                          <TableCell className="font-mono font-bold text-[#1D1C19]">
                            {item.sku}
                          </TableCell>

                          <TableCell>
                            <span className="font-bold block">{item.nome}</span>
                            <span className="text-slate-400 text-[10px]">
                              {item.marca} {item.modelo} {item.localizacao_fisica ? `• ${item.localizacao_fisica}` : ""}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {item.categoria}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center font-bold text-slate-800 dark:text-slate-200">
                            {saldos.saldoFisico} {item.unidade_medida}
                          </TableCell>

                          <TableCell className="text-center text-amber-600 font-medium">
                            {saldos.saldoReservado} {item.unidade_medida}
                          </TableCell>

                          <TableCell className="text-center font-bold text-emerald-600">
                            {saldos.saldoDisponivel} {item.unidade_medida}
                          </TableCell>

                          <TableCell className="text-right font-mono">
                            {item.custo_medio > 0
                              ? `R$ ${item.custo_medio.toFixed(2)}`
                              : "Custo não informado"}
                          </TableCell>

                          <TableCell className="text-center">
                            {isZerado ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Zerado
                              </Badge>
                            ) : isAbaixoMin ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                                Abaixo Mín. ({item.estoque_minimo})
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">
                                Normal
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setItemPreSelecionadoId(item.id);
                                  setDialogMovOpen(true);
                                }}
                              >
                                Movimentar
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setItemParaEditar(item);
                                  setDialogItemOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: LIVRO RAZÃO IMUTÁVEL DE MOVIMENTAÇÕES */}
        <TabsContent value="movimentacoes" className="space-y-4 pt-3">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-xs">
                    <TableHead className="font-bold">Código Op.</TableHead>
                    <TableHead className="font-bold">Data & Hora</TableHead>
                    <TableHead className="font-bold">SKU / Produto</TableHead>
                    <TableHead className="font-bold">Tipo</TableHead>
                    <TableHead className="font-bold text-center">Quantidade</TableHead>
                    <TableHead className="font-bold text-right">Custo Unit.</TableHead>
                    <TableHead className="font-bold">Motivo / Vínculo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        Nenhuma movimentação registrada no livro razão.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimentacoes.map((m) => {
                      const item = itens.find((i) => i.id === m.item_id);

                      return (
                        <TableRow key={m.id} className="text-xs">
                          <TableCell className="font-mono font-bold text-blue-600">
                            {m.codigo_operacao}
                          </TableCell>

                          <TableCell className="text-slate-500">
                            {new Date(m.created_at).toLocaleString("pt-BR")}
                          </TableCell>

                          <TableCell className="font-medium">
                            {item ? `[${item.sku}] ${item.nome}` : "Item removido"}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-mono ${
                                m.tipo === "entrada"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : m.tipo === "consumo"
                                  ? "bg-blue-50 text-blue-600"
                                  : m.tipo === "reserva"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {m.tipo}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center font-bold">
                            {m.quantidade} {item?.unidade_medida || ""}
                          </TableCell>

                          <TableCell className="text-right font-mono">
                            R$ {m.custo_unitario.toFixed(2)}
                          </TableCell>

                          <TableCell className="text-slate-600 max-w-xs truncate">
                            {m.motivo || "Sem motivo informado"}{" "}
                            {m.ordem_servico_id ? "• Vinculado a OS" : ""}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: INVENTÁRIOS FÍSICOS */}
        <TabsContent value="inventarios" className="space-y-4 pt-3">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-xs">
                    <TableHead className="font-bold">Código Inventário</TableHead>
                    <TableHead className="font-bold">Data de Abertura</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                        Nenhum inventário registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventarios.map((inv) => (
                      <TableRow key={inv.id} className="text-xs">
                        <TableCell className="font-mono font-bold text-purple-600">
                          {inv.codigo}
                        </TableCell>

                        <TableCell className="text-slate-500">
                          {new Date(inv.created_at).toLocaleString("pt-BR")}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600">
                            {inv.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-slate-600">
                          {inv.observacoes || "Sem observações"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGOS MODAIS */}
      <EstoqueItemDialog
        open={dialogItemOpen}
        onOpenChange={setDialogItemOpen}
        itensExistentes={itens}
        itemParaEditar={itemParaEditar}
        onSave={handleSalvarItem}
      />

      <EstoqueMovimentacaoDialog
        open={dialogMovOpen}
        onOpenChange={setDialogMovOpen}
        itens={itens}
        movimentacoesExistentes={movimentacoes}
        itemPreSelecionadoId={itemPreSelecionadoId}
        onSuccess={refetchAll}
      />

      <EstoqueInventarioDialog
        open={dialogInvOpen}
        onOpenChange={setDialogInvOpen}
        itens={itens}
        movimentacoes={movimentacoes}
        onSuccess={refetchAll}
      />
    </div>
  );
}
