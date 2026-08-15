import { useState } from "react";
import { OrdemServico, Cliente, Tecnico } from "@/hooks/use-crm";
import { ORDENS_STATUS_LIST, OrdemStatus, formatCurrency } from "@/lib/ordens-servico";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  User,
  Wrench,
  MoreVertical,
  MapPin,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";

interface OrdensKanbanViewProps {
  ordens: OrdemServico[];
  clientes: Cliente[];
  tecnicos: Tecnico[];
  onSelectOrdem: (ordem: OrdemServico) => void;
  onUpdateStatus: (ordem: OrdemServico, novoStatus: OrdemStatus, motivoCancelamento?: string) => void;
  onCancelarOrdem: (ordem: OrdemServico) => void;
}

export function OrdensKanbanView({
  ordens,
  clientes,
  tecnicos,
  onSelectOrdem,
  onUpdateStatus,
  onCancelarOrdem,
}: OrdensKanbanViewProps) {
  const clienteMap = new Map(clientes.map((c) => [c.id, c.nome]));
  const tecnicoMap = new Map(tecnicos.map((t) => [t.id, t.nome]));

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade?.toLowerCase()) {
      case "urgente":
      case "alta":
        return "bg-rose-500/10 text-rose-600 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400";
      case "média":
      case "media":
        return "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400";
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x scrollbar-thin">
      {ORDENS_STATUS_LIST.map((statusColumn) => {
        const ordensNaColuna = ordens.filter((o) => o.status === statusColumn);

        return (
          <div
            key={statusColumn}
            className="w-80 shrink-0 snap-start flex flex-col bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs"
          >
            {/* Header da Coluna */}
            <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/60 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  {statusColumn}
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {ordensNaColuna.length}
                </span>
              </div>
            </div>

            {/* Lista de Cards da Coluna */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
              {ordensNaColuna.length === 0 ? (
                <div className="text-xs text-center text-slate-400 dark:text-slate-500 py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhuma ordem
                </div>
              ) : (
                ordensNaColuna.map((ordem) => {
                  const nomeCliente = clienteMap.get(ordem.cliente_id) || "Cliente não informado";
                  const nomeTecnico = ordem.tecnico_id ? tecnicoMap.get(ordem.tecnico_id) || "Sem técnico" : "Sem técnico";

                  return (
                    <Card
                      key={ordem.id}
                      className="group relative cursor-pointer hover:shadow-md transition-all border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-950"
                      onClick={() => onSelectOrdem(ordem)}
                    >
                      <CardContent className="p-3.5 flex flex-col gap-2.5">
                        {/* Top Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              {ordem.codigo}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 font-medium ${getPriorityColor(
                                ordem.prioridade,
                              )}`}
                            >
                              {ordem.prioridade}
                            </Badge>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => onSelectOrdem(ordem)}>
                                <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                              </DropdownMenuItem>
                              {ORDENS_STATUS_LIST.filter((s) => s !== ordem.status).map((st) => (
                                <DropdownMenuItem
                                  key={st}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (st === "Cancelada") {
                                      onCancelarOrdem(ordem);
                                    } else {
                                      onUpdateStatus(ordem, st);
                                    }
                                  }}
                                >
                                  Mover para: {st}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Nome do Cliente */}
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                          {nomeCliente}
                        </div>

                        {/* Descrição Curta */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {ordem.descricao_problema}
                        </p>

                        {/* Endereço */}
                        {ordem.endereco_visita && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{ordem.endereco_visita}</span>
                          </div>
                        )}

                        {/* Footer Info */}
                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[100px]">{nomeTecnico}</span>
                          </div>

                          <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>
                              {new Date(ordem.data_prevista + "T00:00:00").toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Integ Status AUVO Badge */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400">
                            Integração AUVO:
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                            <Clock className="h-2.5 w-2.5" /> Integração pendente
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
