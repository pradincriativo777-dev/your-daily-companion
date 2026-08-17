import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useClientes,
  useEquipamentos,
  useEquipamentoGarantias,
  useEquipamentoPlanosPreventivos,
  useEquipamentoAnexos,
  useOrdensServico,
  Equipamento,
} from "@/hooks/use-crm";
import {
  CATEGORIAS_EQUIPAMENTO_INICIAIS,
  EQUIPAMENTO_ESTADOS_LIST,
  calcularEstadoGarantia,
} from "@/lib/equipamentos";
import { EquipamentoDialog } from "@/components/crm/EquipamentoDialog";
import { EquipamentoDetalhesDialog } from "@/components/crm/EquipamentoDetalhesDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Search,
  Wrench,
  ShieldCheck,
  Eye,
  Pencil,
  Calendar,
  User,
  Filter,
  RefreshCw,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/equipamentos")({
  component: EquipamentosCentralPage,
});

function EquipamentosCentralPage() {
  const { data: equipamentos = [], refetch: refetchEquipamentos } = useEquipamentos();
  const { data: clientes = [] } = useClientes();
  const { data: garantias = [], refetch: refetchGarantias } = useEquipamentoGarantias();
  const { data: planos = [], refetch: refetchPlanos } = useEquipamentoPlanosPreventivos();
  const { data: anexos = [], refetch: refetchAnexos } = useEquipamentoAnexos();
  const { data: ordensServico = [] } = useOrdensServico();

  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("all");
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [filtroEstado, setFiltroEstado] = useState("all");

  const [dialogCriarOpen, setDialogCriarOpen] = useState(false);
  const [equipamentoParaEditar, setEquipamentoParaEditar] = useState<Equipamento | null>(null);

  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<Equipamento | null>(null);

  const clienteMap = new Map(clientes.map((c) => [c.id, c.nome]));

  const equipamentosFiltrados = equipamentos.filter((eq) => {
    const nomeCliente = clienteMap.get(eq.cliente_id) || "";
    const term = busca.toLowerCase();

    const matchBusca =
      !busca ||
      eq.marca.toLowerCase().includes(term) ||
      eq.modelo.toLowerCase().includes(term) ||
      (eq.numero_serie || "").toLowerCase().includes(term) ||
      nomeCliente.toLowerCase().includes(term) ||
      eq.categoria.toLowerCase().includes(term);

    const matchCliente = filtroCliente === "all" || eq.cliente_id === filtroCliente;
    const matchCategoria = filtroCategoria === "all" || eq.categoria === filtroCategoria;
    const matchEstado = filtroEstado === "all" || eq.estado === filtroEstado;

    return matchBusca && matchCliente && matchCategoria && matchEstado;
  });

  const handleSalvarEquipamento = async (dados: Partial<Equipamento>) => {
    try {
      if (dados.id) {
        const { error } = await (supabase.from as any)("equipamentos")
          .update({
            ...dados,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dados.id);

        if (error) throw error;
        toast.success("Equipamento atualizado com sucesso!");
      } else {
        const { error } = await (supabase.from as any)("equipamentos").insert(dados);
        if (error) throw error;
        toast.success("Equipamento cadastrado com sucesso!");
      }

      refetchEquipamentos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar equipamento.");
      throw err;
    }
  };

  const refetchAll = () => {
    refetchEquipamentos();
    refetchGarantias();
    refetchPlanos();
    refetchAnexos();
  };

  return (
    <div className="space-y-6 p-1 md:p-4">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#100D3F]">
            Central de Equipamentos Instalados
          </h1>
          <p className="text-xs text-[#706D65]">
            Gerencie o parque de equipamentos por cliente, números de série e estado operacional.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEquipamentoParaEditar(null);
            setDialogCriarOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Novo Equipamento
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-[#E2DDD0] shadow-sm">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#706D65]" />
          <Input
            placeholder="Buscar por marca, modelo, série ou cliente..."
            className="pl-9 h-9 text-xs"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div>
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIAS_EQUIPAMENTO_INICIAIS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {EQUIPAMENTO_ESTADOS_LIST.map((est) => (
                <SelectItem key={est} value={est}>
                  {est}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Equipamentos */}
      <Card className="border-0 shadow-none overflow-hidden bg-transparent">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8F6F1] text-xs border-b border-[#E2DDD0]">
                <TableHead className="font-bold">Cliente</TableHead>
                <TableHead className="font-bold">Categoria</TableHead>
                <TableHead className="font-bold">Equipamento (Marca / Modelo)</TableHead>
                <TableHead className="font-bold">Nº de Série</TableHead>
                <TableHead className="font-bold">Instalação</TableHead>
                <TableHead className="font-bold">Estado</TableHead>
                <TableHead className="w-20 text-center font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipamentosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Nenhum equipamento encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                equipamentosFiltrados.map((eq) => {
                  const nomeCliente = clienteMap.get(eq.cliente_id) || "Cliente não informado";

                  return (
                    <TableRow
                      key={eq.id}
                      className="hover:bg-[#FAF5E8]/60 cursor-pointer text-xs border-b border-[#E2DDD0]"
                      onClick={() => {
                        setEquipamentoSelecionado(eq);
                        setDialogDetalhesOpen(true);
                      }}
                    >
                      <TableCell className="font-semibold text-[#1D1C19]">
                        {nomeCliente}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {eq.categoria}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-bold text-[#1D1C19]">
                        {eq.marca} {eq.modelo}
                      </TableCell>

                      <TableCell className="font-mono text-[#706D65]">
                        {eq.numero_serie || "—"}
                      </TableCell>

                      <TableCell className="text-[#706D65]">
                        {eq.data_instalacao
                          ? new Date(eq.data_instalacao + "T00:00:00").toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            eq.estado === "Ativo"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : eq.estado === "Em manutenção"
                              ? "bg-amber-50 text-amber-600 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {eq.estado}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEquipamentoSelecionado(eq);
                            setDialogDetalhesOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIÁLOGOS MODAIS */}
      <EquipamentoDialog
        open={dialogCriarOpen}
        onOpenChange={setDialogCriarOpen}
        clientes={clientes}
        ordensServico={ordensServico}
        equipamentosExistentes={equipamentos}
        equipamentoParaEditar={equipamentoParaEditar}
        onSave={handleSalvarEquipamento}
      />

      <EquipamentoDetalhesDialog
        open={dialogDetalhesOpen}
        onOpenChange={setDialogDetalhesOpen}
        equipamento={equipamentoSelecionado}
        cliente={equipamentoSelecionado ? clientes.find((c) => c.id === equipamentoSelecionado.cliente_id) : null}
        garantias={garantias}
        planosPreventivos={planos}
        anexos={anexos}
        ordensServico={ordensServico}
        onRefreshData={refetchAll}
        onEditarEquipamento={(eq) => {
          setEquipamentoParaEditar(eq);
          setDialogCriarOpen(true);
        }}
      />
    </div>
  );
}
