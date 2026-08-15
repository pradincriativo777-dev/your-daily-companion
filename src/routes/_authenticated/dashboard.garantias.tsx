import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useClientes,
  useEquipamentos,
  useEquipamentoGarantias,
  useEquipamentoPlanosPreventivos,
  useOrdensServico,
  EquipamentoGarantia,
  EquipamentoPlanoPreventivo,
} from "@/hooks/use-crm";
import {
  calcularEstadoGarantia,
  verificarOSDuplicadaParaAlerta,
} from "@/lib/equipamentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Plus,
  Wrench,
  Calendar,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/garantias")({
  component: GarantiasCentralPage,
});

function GarantiasCentralPage() {
  const { data: garantias = [], refetch: refetchGarantias } = useEquipamentoGarantias();
  const { data: planos = [], refetch: refetchPlanos } = useEquipamentoPlanosPreventivos();
  const { data: equipamentos = [] } = useEquipamentos();
  const { data: clientes = [] } = useClientes();
  const { data: ordensServico = [], refetch: refetchOrdens } = useOrdensServico();

  const [busca, setBusca] = useState("");
  const [filtroEstadoGarantia, setFiltroEstadoGarantia] = useState("all");
  const [activeTab, setActiveTab] = useState("garantias");

  const clienteMap = new Map(clientes.map((c) => [c.id, c.nome]));
  const eqMap = new Map(equipamentos.map((e) => [e.id, e]));

  // Cálculo de KPIs
  const garantiasCalculadas = garantias.map((g) => {
    const eq = eqMap.get(g.equipamento_id);
    const estadoCalc = calcularEstadoGarantia({ dataTermino: g.data_termino });
    return {
      garantia: g,
      equipamento: eq,
      clienteNome: eq ? clienteMap.get(eq.cliente_id) || "Cliente" : "Cliente",
      estadoCalc,
    };
  });

  const totalVigentes = garantiasCalculadas.filter((g) => g.estadoCalc === "Vigente").length;
  const totalProximasVencimento = garantiasCalculadas.filter(
    (g) => g.estadoCalc === "Próxima do vencimento",
  ).length;
  const totalVencidas = garantiasCalculadas.filter((g) => g.estadoCalc === "Vencida").length;
  const totalSemData = garantiasCalculadas.filter(
    (g) => g.estadoCalc === "Sem informação suficiente",
  ).length;

  // Preventivas Vencidas
  const preventivasAlertas = planos.map((p) => {
    const eq = eqMap.get(p.equipamento_id);
    const dtProx = p.proxima_manutencao ? new Date(p.proxima_manutencao + "T00:00:00") : null;
    const isVencido = dtProx && dtProx < new Date();
    const jaTemOS = verificarOSDuplicadaParaAlerta(p.id, ordensServico);

    return {
      plano: p,
      equipamento: eq,
      clienteNome: eq ? clienteMap.get(eq.cliente_id) || "Cliente" : "Cliente",
      isVencido,
      jaTemOS,
    };
  });

  const totalPreventivasVencidas = preventivasAlertas.filter((a) => a.isVencido).length;

  const handleCriarOSRascunho = async (item: typeof preventivasAlertas[0]) => {
    if (!item.equipamento) return;

    if (item.jaTemOS) {
      toast.error("Já existe uma Ordem de Serviço em Rascunho ou Ativa para este alerta.");
      return;
    }

    try {
      const cli = clientes.find((c) => c.id === item.equipamento?.cliente_id);

      const { error } = await (supabase.from as any)("ordens_servico").insert({
        cliente_id: item.equipamento.cliente_id,
        tipo_atendimento: "Manutenção Preventiva",
        prioridade: "Média",
        descricao_problema: `MANUTENÇÃO PREVENTIVA ALERTA: ${item.plano.tipo_manutencao} para o equipamento ${item.equipamento.marca} ${item.equipamento.modelo}.`,
        servico_solicitado: `Execução do plano de preventiva: ${item.plano.tipo_manutencao}`,
        endereco_visita: cli?.endereco ? `${cli.endereco}, ${cli.cidade || ""}` : "Endereço do cliente",
        data_prevista: new Date().toISOString().split("T")[0],
        status: "Rascunho",
        origem_solicitacao: "Alerta Preventiva",
        observacoes_internas: `PLANO_ID:${item.plano.id} | EQUIPAMENTO_ID:${item.equipamento.id} | Criado automaticamente a partir de alerta preventivo vencido/próximo.`,
      });

      if (error) throw error;

      toast.success("Ordem de Serviço criada em RASCUNHO com sucesso!");
      refetchOrdens();
      refetchPlanos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar OS rascunho.");
    }
  };

  const garantiasFiltradas = garantiasCalculadas.filter((item) => {
    const term = busca.toLowerCase();
    const matchBusca =
      !busca ||
      item.clienteNome.toLowerCase().includes(term) ||
      (item.equipamento?.marca || "").toLowerCase().includes(term) ||
      (item.equipamento?.modelo || "").toLowerCase().includes(term) ||
      item.garantia.tipo.toLowerCase().includes(term);

    const matchEstado =
      filtroEstadoGarantia === "all" || item.estadoCalc === filtroEstadoGarantia;

    return matchBusca && matchEstado;
  });

  return (
    <div className="space-y-6 p-1 md:p-4">
      {/* Header Principal */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Central de Garantias & Manutenção Preventiva
        </h1>
        <p className="text-xs text-slate-500">
          Monitore prazos de garantias dos fabricantes e alertas de preventivas dos equipamentos instalados.
        </p>
      </div>

      {/* Cards de Métricas e Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="bg-white dark:bg-slate-950 border">
          <CardContent className="p-3.5">
            <span className="text-xs text-slate-500 block font-medium">Vigentes</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalVigentes}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border">
          <CardContent className="p-3.5">
            <span className="text-xs text-slate-500 block font-medium">Próximas Vencimento</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {totalProximasVencimento}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border">
          <CardContent className="p-3.5">
            <span className="text-xs text-slate-500 block font-medium">Garantias Vencidas</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {totalVencidas}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border">
          <CardContent className="p-3.5">
            <span className="text-xs text-slate-500 block font-medium">Sem Data Final</span>
            <span className="text-xl font-bold text-slate-600 dark:text-slate-300">
              {totalSemData}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-950 border">
          <CardContent className="p-3.5">
            <span className="text-xs text-slate-500 block font-medium">Preventivas Vencidas</span>
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {totalPreventivasVencidas}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo com Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="garantias" className="text-xs">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Garantias por Equipamento
          </TabsTrigger>
          <TabsTrigger value="preventivas" className="text-xs">
            <Wrench className="h-3.5 w-3.5 mr-1" /> Alertas de Preventiva
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GARANTIAS */}
        <TabsContent value="garantias" className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, tipo de garantia ou marca/modelo..."
                className="pl-9 h-9 text-xs"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div>
              <Select value={filtroEstadoGarantia} onValueChange={setFiltroEstadoGarantia}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Estado da Garantia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Próxima do vencimento">Próxima do vencimento</SelectItem>
                  <SelectItem value="Vencida">Vencida</SelectItem>
                  <SelectItem value="Sem informação suficiente">Sem informação suficiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-xs">
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Equipamento</TableHead>
                    <TableHead className="font-bold">Tipo de Garantia</TableHead>
                    <TableHead className="font-bold">Início</TableHead>
                    <TableHead className="font-bold">Término</TableHead>
                    <TableHead className="font-bold">Situação Calculada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {garantiasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                        Nenhuma garantia registrada com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    garantiasFiltradas.map(({ garantia, equipamento, clienteNome, estadoCalc }) => (
                      <TableRow key={garantia.id} className="text-xs">
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {clienteNome}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                          {equipamento ? `${equipamento.marca} ${equipamento.modelo}` : "N/A"}
                        </TableCell>
                        <TableCell>{garantia.tipo}</TableCell>
                        <TableCell className="text-slate-500">
                          {garantia.data_inicio
                            ? new Date(garantia.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {garantia.data_termino
                            ? new Date(garantia.data_termino + "T00:00:00").toLocaleDateString("pt-BR")
                            : "Sem data final"}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ALERTAS PREVENTIVAS */}
        <TabsContent value="preventivas" className="space-y-4 pt-3">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-xs">
                    <TableHead className="font-bold">Cliente</TableHead>
                    <TableHead className="font-bold">Equipamento</TableHead>
                    <TableHead className="font-bold">Tipo de Manutenção</TableHead>
                    <TableHead className="font-bold">Periodicidade</TableHead>
                    <TableHead className="font-bold">Próxima Data</TableHead>
                    <TableHead className="font-bold">Status Alerta</TableHead>
                    <TableHead className="text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preventivasAlertas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                        Nenhum alerta de manutenção preventiva configurado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    preventivasAlertas.map((item) => (
                      <TableRow key={item.plano.id} className="text-xs">
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.clienteNome}
                        </TableCell>
                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                          {item.equipamento
                            ? `${item.equipamento.marca} ${item.equipamento.modelo}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>{item.plano.tipo_manutencao}</TableCell>
                        <TableCell>A cada {item.plano.periodicidade_meses} meses</TableCell>
                        <TableCell className="font-bold">
                          {item.plano.proxima_manutencao
                            ? new Date(item.plano.proxima_manutencao + "T00:00:00").toLocaleDateString(
                                "pt-BR",
                              )
                            : "Sem data"}
                        </TableCell>
                        <TableCell>
                          {item.isVencido ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Manutenção Vencida
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600">
                              Em dia
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.isVencido && (
                            <Button
                              size="sm"
                              variant={item.jaTemOS ? "ghost" : "secondary"}
                              className="h-7 text-xs"
                              disabled={item.jaTemOS}
                              onClick={() => handleCriarOSRascunho(item)}
                            >
                              {item.jaTemOS ? "OS Já Criada" : "Gerar OS Rascunho"}
                            </Button>
                          )}
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
    </div>
  );
}
