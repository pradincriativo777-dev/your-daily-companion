import { Eye, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ViewMode } from "@/hooks/use-view-mode";

export interface ViewModeToggleProps {
  mode: ViewMode;
  onToggle: () => void;
}

export function ViewModeToggle({ mode, onToggle }: ViewModeToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      className="h-8 border-[#E2DDD0] bg-white text-[#24231F] hover:bg-[#FAF5E8] text-xs font-semibold px-2.5 rounded-lg gap-1.5 shadow-2xs"
    >
      {mode === "simples" ? (
        <>
          <Eye className="h-3.5 w-3.5 text-[#E2B321]" />
          <span>Modo Simples</span>
        </>
      ) : (
        <>
          <Layers className="h-3.5 w-3.5 text-[#100D3F]" />
          <span>Modo Completo</span>
        </>
      )}
    </Button>
  );
}
