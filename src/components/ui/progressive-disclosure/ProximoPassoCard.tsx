import { ArrowRight, Sparkles, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type ProximaAcaoRecomendada } from "@/lib/proxima-acao-engine";

export interface ProximoPassoCardProps {
  acao: ProximaAcaoRecomendada;
  onExecuteAction: (actionKey: string) => void;
  onToggleViewMode?: () => void;
  isSimples?: boolean;
}

export function ProximoPassoCard({
  acao,
  onExecuteAction,
  onToggleViewMode,
  isSimples = true,
}: ProximoPassoCardProps) {
  const getBadgeStyle = () => {
    switch (acao.tipo) {
      case "warning":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "success":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "info":
        return "bg-blue-100 text-blue-900 border-blue-300";
      default:
        return "bg-[#FAF5E8] text-[#100D3F] border-[#E2B321]";
    }
  };

  const getIcon = () => {
    switch (acao.tipo) {
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-700 shrink-0" />;
      default:
        return <Sparkles className="h-4 w-4 text-[#E2B321] shrink-0" />;
    }
  };

  return (
    <div className="rounded-2xl border border-[#E2DDD0] bg-white p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#FAF5E8] border border-[#E2DDD0] shrink-0">
          {getIcon()}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8C82]">
              Próxima ação recomendada
            </span>
            <Badge variant="outline" className={`text-[10px] font-bold ${getBadgeStyle()}`}>
              {acao.tipo === "warning" ? "Atenção Operacional" : "Recomendado"}
            </Badge>
          </div>
          <h4 className="text-sm font-bold text-[#100D3F]">{acao.label}</h4>
          <p className="text-xs text-[#706D65]">{acao.explicacao}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {onToggleViewMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleViewMode}
            className="text-xs text-[#706D65] hover:text-[#100D3F] hover:bg-[#FAF5E8]"
          >
            {isSimples ? "Modo Completo" : "Modo Simples"}
          </Button>
        )}

        <Button
          type="button"
          size="default"
          onClick={() => onExecuteAction(acao.actionKey)}
          className="bg-[#100D3F] text-white hover:bg-[#1A165C] text-xs font-bold px-4 h-11 min-h-[44px] rounded-xl shadow-sm cursor-pointer shrink-0"
        >
          <span>{acao.label}</span>
          <ArrowRight className="ml-1.5 h-4 w-4 text-[#E2B321]" />
        </Button>
      </div>
    </div>
  );
}
