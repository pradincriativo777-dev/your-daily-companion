import { forwardRef } from "react";
import { Sparkles } from "lucide-react";
import { JansolSunIcon } from "./JansolLogo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface JansolAssistenteButtonProps {
  onClick: () => void;
}

export const JansolAssistenteButton = forwardRef<
  HTMLButtonElement,
  JansolAssistenteButtonProps
>(({ onClick }, ref) => {
  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 pb-[var(--sab)]">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={ref}
              type="button"
              onClick={onClick}
              aria-label="Abrir JANSOL Assistente"
              className="group relative flex h-[52px] w-[52px] md:h-[54px] md:w-[54px] items-center justify-center rounded-full bg-[#1D1C19] text-[#F8F6F1] border border-[#2B2924] shadow-lg transition-all duration-180 hover:translate-y-[-1px] hover:border-[#E3B94F] hover:bg-[#292722] focus:outline-none focus:ring-2 focus:ring-[#E3B94F] focus:ring-offset-2 focus:ring-offset-[#F8F6F1] cursor-pointer"
            >
              {/* Ícone Solar com Brilho Dourado JANSOL */}
              <div className="relative flex items-center justify-center">
                <JansolSunIcon className="h-6 w-6 text-[#E3B94F] transition-transform duration-180 group-hover:scale-105" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-[#F1D47D]" />
              </div>

              {/* Pequeno Ponto Dourado da Marca */}
              <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-[#E3B94F] ring-2 ring-[#1D1C19]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="border-[#E2DDD0] bg-[#1D1C19] text-xs font-semibold text-[#F8F6F1] px-3 py-1.5 shadow-md">
            Abrir JANSOL Assistente (⌘J / Ctrl+J)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

JansolAssistenteButton.displayName = "JansolAssistenteButton";
