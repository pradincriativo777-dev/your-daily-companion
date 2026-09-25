import { MessageSquare, CheckCircle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AuvoChatAtendimentoState, limparAtendimentoPendente } from "@/lib/auvo-chat-assistant";

export interface AuvoChatPendingBannerProps {
  atendimento: AuvoChatAtendimentoState | null;
  onRegistrarResultado: () => void;
  onContinuarDepois: () => void;
  onCancelarAtendimento: () => void;
}

export function AuvoChatPendingBanner({
  atendimento,
  onRegistrarResultado,
  onContinuarDepois,
  onCancelarAtendimento,
}: AuvoChatPendingBannerProps) {
  if (!atendimento) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 max-w-sm w-full bg-[#1D1C19] text-[#F8F6F1] border border-[#3A3730] p-4 shadow-2xl rounded-2xl animate-in slide-in-from-bottom duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E3B94F]/20 text-[#E3B94F]">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#F8F6F1]">
              Atendimento Auvo Chat em andamento
            </h4>
            <p className="text-[11px] text-[#A09D96] truncate max-w-[200px]">
              Cliente: <strong className="text-white">{atendimento.clienteNome}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinuarDepois}
          aria-label="Minimizar aviso"
          className="text-[#A09D96] hover:text-white p-1 rounded-md"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="text-xs text-[#E2DDD0] mt-2.5 mb-3 font-medium">
        Você terminou o atendimento deste cliente?
      </p>

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={onRegistrarResultado}
          className="bg-[#E3B94F] text-[#1D1C19] hover:bg-[#F1D47D] text-xs font-bold flex-1 h-8 rounded-lg"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Registrar resultado
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onContinuarDepois}
          className="text-xs text-[#A09D96] hover:text-white hover:bg-white/10 h-8 rounded-lg px-2.5"
        >
          Depois
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancelarAtendimento}
          className="text-xs text-[#E53E3E] hover:text-[#FC8181] hover:bg-[#E53E3E]/10 h-8 rounded-lg px-2"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
