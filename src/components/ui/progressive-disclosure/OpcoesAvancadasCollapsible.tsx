import { useState } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OpcoesAvancadasCollapsibleProps {
  children: React.ReactNode;
  titulo?: string;
  resumoValores?: string | null;
  defaultOpen?: boolean;
}

export function OpcoesAvancadasCollapsible({
  children,
  titulo = "Opções avançadas",
  resumoValores,
  defaultOpen = false,
}: OpcoesAvancadasCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-[#E2DDD0] bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-xs font-bold text-[#100D3F] hover:text-[#1A165C] cursor-pointer focus:outline-none"
        >
          <Settings2 className="h-4 w-4 text-[#8E8C82]" />
          <span>{titulo}</span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#8E8C82]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#8E8C82]" />
          )}
        </button>

        {!open && resumoValores && (
          <span className="text-[11px] font-medium text-[#706D65] bg-[#FAF5E8] px-2 py-0.5 rounded border border-[#E2DDD0]">
            {resumoValores}
          </span>
        )}
      </div>

      {open && (
        <div className="pt-2 border-t border-[#E2DDD0]/60 space-y-3 animate-in fade-in-50 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
