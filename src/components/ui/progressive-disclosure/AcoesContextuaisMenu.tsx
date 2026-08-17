import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ItemAcao {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline";
  onClick: () => void;
  disabled?: boolean;
}

export interface AcoesContextuaisMenuProps {
  acaoPrincipal?: ItemAcao;
  acoesSecundarias?: ItemAcao[];
  maisAcoes?: ItemAcao[];
  acoesDestrutivas?: ItemAcao[];
}

export function AcoesContextuaisMenu({
  acaoPrincipal,
  acoesSecundarias = [],
  maisAcoes = [],
  acoesDestrutivas = [],
}: AcoesContextuaisMenuProps) {
  const visiveisSecundarias = acoesSecundarias.slice(0, 3);
  const possuiMaisAcoes = maisAcoes.length > 0 || acoesDestrutivas.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 1. Botão Principal Contextual */}
      {acaoPrincipal && (
        <Button
          type="button"
          disabled={acaoPrincipal.disabled}
          onClick={acaoPrincipal.onClick}
          className="bg-[#100D3F] text-white hover:bg-[#1A165C] text-xs font-bold h-10 px-4 rounded-xl shadow-sm cursor-pointer flex items-center gap-2 min-h-[40px]"
        >
          {acaoPrincipal.icon}
          <span>{acaoPrincipal.label}</span>
        </Button>
      )}

      {/* 2. Ações Secundárias Visíveis com Texto Claro (Até 3) */}
      {visiveisSecundarias.map((sec) => (
        <Button
          key={sec.key}
          type="button"
          variant="outline"
          disabled={sec.disabled}
          onClick={sec.onClick}
          className="border-[#E2DDD0] bg-white text-[#1D1C19] hover:bg-[#FAF5E8] text-xs font-semibold h-10 px-3 rounded-xl cursor-pointer flex items-center gap-1.5 min-h-[40px]"
        >
          {sec.icon}
          <span>{sec.label}</span>
        </Button>
      ))}

      {/* 3. Menu "Mais ações" */}
      {possuiMaisAcoes && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-[#E2DDD0] bg-white text-[#706D65] hover:bg-[#FAF5E8] hover:text-[#100D3F] h-10 w-10 min-h-[40px] min-w-[40px] rounded-xl"
              aria-label="Mais ações"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border border-[#E2DDD0] bg-white p-1 shadow-md">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-[#8E8C82] px-2.5 py-1.5">
              Mais Ações
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E2DDD0]" />

            {maisAcoes.map((item) => (
              <DropdownMenuItem
                key={item.key}
                disabled={Boolean(item.disabled)}
                onClick={item.onClick}
                className="flex items-center gap-2 rounded-lg py-2 px-2.5 text-xs font-medium text-[#24231F] hover:bg-[#FAF5E8] cursor-pointer"
              >
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}

            {/* Ações Destrutivas Separadas no Final */}
            {acoesDestrutivas.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-[#E2DDD0]" />
                {acoesDestrutivas.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    disabled={Boolean(item.disabled)}
                    onClick={item.onClick}
                    className="flex items-center gap-2 rounded-lg py-2 px-2.5 text-xs font-bold text-[#C53030] hover:bg-[#FFF5F5] cursor-pointer"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
