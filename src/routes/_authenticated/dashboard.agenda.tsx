import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useClientes, useManutencoes, useTecnicos } from "@/hooks/use-crm";
import { AgendarVisitaDialog } from "@/components/crm/AgendarVisitaDialog";
import { DownloadCloud } from "lucide-react";
import { retryAuvoTaskSync, importAuvoSchedule } from "@/lib/integrations/auvo.server";
import { format, parseISO, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard/agenda")({
  component: AgendaPage,
});

function AgendaPage() {
  const { data: manutencoes = [], refetch } = useManutencoes();
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();

  // State & Filters
  const [viewMode, setViewMode] = useState<"dia" | "semana" | "mes">("semana");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );

  const [fTecnico, setFTecnico] = useState("TODOS");
  const [fStatus, setFStatus] = useState("TODOS");
  const [fTipo, setFTipo] = useState("TODOS");
  const [buscaCliente, setBuscaCliente] = useState("");

  const [agendarOpen, setAgendarOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [importingSchedule, setImportingSchedule] = useState(false);

  const handleImportSchedule = async () => {
    setImportingSchedule(true);
    try {
      const res = await importAuvoSchedule();
      if (res.success) {
        toast.success(res.message);
        refetch();
      } else {
        toast.error(`Falha ao importar agenda: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao importar agenda: ${err.message}`);
    } finally {
      setImportingSchedule(false);
    }
  };

  // Map Clientes & Tecnicos lookup for quick access
  const clientesMap = useMemo(() => {
    const map = new Map();
    clientes.forEach((c) => map.set(c.id, c));
    return map;
  }, [clientes]);

  const tecnicosMap = useMemo(() => {
    const map = new Map();
    tecnicos.forEach((t) => map.set(t.id, t));
    return map;
  }, [tecnicos]);

  // Filtering Logic
  const filteredManutencoes = useMemo(() => {
    const curDate = parseISO(selectedDate);

    return manutencoes.filter((m) => {
      const desc = String(m.descricao || "").toLowerCase();
      if (desc.includes("coletor solar") || desc.includes("boiler") || desc.includes("8812")) return false;
      const mDate = parseISO(m.data_manutencao);

      // Date View Filter
      if (viewMode === "dia" && !isSameDay(mDate, curDate)) return false;
      if (viewMode === "semana" && !isSameWeek(mDate, curDate, { weekStartsOn: 1 })) return false;
      if (viewMode === "mes" && !isSameMonth(mDate, curDate)) return false;

      // Filter by Tech
      if (fTecnico !== "TODOS" && m.tecnico_id !== fTecnico) return false;

      // Filter by Sync Status
      if (fStatus !== "TODOS") {
        if (fStatus === "sincronizado" && m.sync_status !== "sincronizado") return false;
        if (fStatus === "erro" && m.sync_status !== "erro_sincronizacao") return false;
        if (fStatus === "pendente" && m.sync_status === "sincronizado") return false;
      }

      // Filter by Type
      if (fTipo !== "TODOS" && m.tipo !== fTipo) return false;

      // Search by Client Name
      if (buscaCliente.trim()) {
        const cli = clientesMap.get(m.cliente_id);
        const name = (cli?.nome || "").toLowerCase();
        if (!name.includes(buscaCliente.trim().toLowerCase())) return false;
      }

      return true;
    });
  }, [manutencoes, selectedDate, viewMode, fTecnico, fStatus, fTipo, buscaCliente, clientesMap]);

  const handleRetrySync = async (manutencaoId: string) => {
    setRetryingId(manutencaoId);
    try {
      const res = await retryAuvoTaskSync({ data: { manutencaoId } });
      if (res.success) {
        toast.success(res.message);
        refetch();
      } else {
        toast.error(`Falha ao retentar sincronização: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao retentar: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#100D3F]">Agenda Operacional</h1>
          <p className="text-[#706D65] text-sm mt-1">
            Visão de compromissos, visitas técnicas e agendamentos locais.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleImportSchedule}
            disabled={true}
            title="API bloqueada pela conta AUVO. Sincronização remota desabilitada."
            className="gap-2 opacity-60 cursor-not-allowed"
          >
            <DownloadCloud className="h-4 w-4 text-amber-500" />
            Puxar Agenda (API Bloqueada)
          </Button>
          <Button onClick={() => setAgendarOpen(true)} size="default" className="gap-2">
            <Plus className="h-5 w-5" /> Nova Visita Técnica
          </Button>
        </div>
      </div>

      {/* Bar Controls: Mode, Date & Quick Filters */}
      <Card className="border-[#E2DDD0] shadow-sm bg-white">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1 bg-[#F2EFE8] border border-[#E2DDD0] p-1 rounded-lg">
              <Button
                variant={viewMode === "dia" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("dia")}
                className="gap-1.5"
              >
                <Clock className="h-4 w-4" /> Dia
              </Button>
              <Button
                variant={viewMode === "semana" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("semana")}
                className="gap-1.5"
              >
                <CalendarDays className="h-4 w-4" /> Semana
              </Button>
              <Button
                variant={viewMode === "mes" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("mes")}
                className="gap-1.5"
              >
                <CalendarRange className="h-4 w-4" /> Mês
              </Button>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0] || "")}>
                Hoje
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
            {/* Search Client */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>

            {/* Filter Tech */}
            <Select value={fTecnico} onValueChange={setFTecnico}>
              <SelectTrigger>
                <SelectValue placeholder="Técnico: Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Técnicos</SelectItem>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Status */}
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status: Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="sincronizado">Sincronizados com AUVO</SelectItem>
                <SelectItem value="erro">Com Erro de Sync</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Type */}
            <Select value={fTipo} onValueChange={setFTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo: Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                <SelectItem value="Preventiva">Preventiva</SelectItem>
                <SelectItem value="Corretiva">Corretiva</SelectItem>
                <SelectItem value="Instalação">Instalação</SelectItem>
                <SelectItem value="Orçamento / Vistoria">Orçamento / Vistoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Agenda Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Exibindo {filteredManutencoes.length} visita(s) agendada(s)
          </p>
        </div>

        {filteredManutencoes.length === 0 ? (
          <Card className="border-dashed border-[#E2DDD0] bg-transparent">
            <CardContent className="p-8 text-center text-[#706D65] space-y-3">
              <CalendarIcon className="h-10 w-10 mx-auto opacity-50 text-[#C8794A]" />
              <p className="font-medium">Nenhum agendamento encontrado para este período ou filtro.</p>
              <Button variant="outline" size="sm" onClick={() => setAgendarOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Agendar Nova Visita
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredManutencoes.map((m) => {
              const cli = clientesMap.get(m.cliente_id);
              const tec = tecnicosMap.get(m.tecnico_id || "");

              const isSyncOk = m.sync_status === "sincronizado";
              const isSyncErr = m.sync_status === "erro_sincronizacao";

              return (
                <Card
                  key={m.id}
                  className={`transition-all bg-white border-[#E2DDD0] shadow-sm border-l-4 ${
                    isSyncOk
                      ? "border-l-green-500 hover:shadow-md"
                      : isSyncErr
                      ? "border-l-destructive hover:shadow-md bg-destructive/5"
                      : "border-l-amber-500 hover:shadow-md"
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {cli ? (
                          <Link
                            to="/dashboard/clientes/$id"
                            params={{ id: cli.id }}
                            className="font-bold text-base hover:underline line-clamp-1"
                          >
                            {cli.nome}
                          </Link>
                        ) : (
                          <span className="font-bold text-base">Cliente não encontrado</span>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {m.endereco_visita || cli?.cidade || "Endereço não informado"}
                        </p>
                      </div>

                      <Badge
                        variant={isSyncOk ? "default" : isSyncErr ? "destructive" : "secondary"}
                        className="shrink-0 text-[10px]"
                      >
                        {m.tipo}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Time & Tech */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 p-2.5 rounded-md">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Data & Hora</span>
                        <span className="font-medium">
                          {format(parseISO(m.data_manutencao), "dd/MM/yyyy")} às {m.horario_inicio || "09:00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Técnico</span>
                        <span className="font-medium flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-primary shrink-0" />
                          {tec?.nome || "Não atribuído"}
                        </span>
                      </div>
                    </div>

                    {/* Description / Instructions */}
                    {m.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-background p-2 rounded border">
                        {m.descricao}
                      </p>
                    )}

                    {/* Sync Status Badge & Auvo ID */}
                    <div className="flex items-center justify-between pt-1 border-t text-xs">
                      <div className="flex items-center gap-1.5">
                        {isSyncOk ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : isSyncErr ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-medium text-[11px]">
                          {isSyncOk
                            ? "Sincronizado AUVO"
                            : isSyncErr
                            ? "Erro ao Sincronizar"
                            : "Pendente"}
                        </span>
                      </div>

                      {m.auvo_task_id && (
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          ID: {m.auvo_task_id}
                        </span>
                      )}
                    </div>

                    {/* Retry Button if sync error */}
                    {isSyncErr && (
                      <div className="space-y-1.5 pt-1">
                        {m.sync_error && (
                          <p className="text-[10px] text-destructive truncate" title={m.sync_error}>
                            Motivo: {m.sync_error}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5 h-8 border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleRetrySync(m.id)}
                          disabled={retryingId === m.id}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${retryingId === m.id ? "animate-spin" : ""}`} />
                          {retryingId === m.id ? "Retentando..." : "Retentar Sincronização AUVO"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Agendar Visita Dialog */}
      <AgendarVisitaDialog
        open={agendarOpen}
        onOpenChange={setAgendarOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
