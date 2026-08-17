import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

export function Topbar({
  collapsed,
  onToggleSidebar,
  onOpenMobileNav,
  userEmail,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
  userEmail?: string | undefined;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b border-[#E7E5DF] bg-[#0B0B0C] px-4 text-white shadow-xs">
        {/* Lado Esquerdo: Controls & Brand */}
        <div className="flex items-center gap-3">
          {/* Menu Mobile */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir Menu JANSOL OS"
            className="text-white hover:bg-white/10 md:hidden h-10 w-10 min-h-[44px] min-w-[44px]"
            onClick={onOpenMobileNav}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Toggle Sidebar Desktop */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={collapsed ? "Expandir Menu" : "Recolher Menu"}
                  className="hidden text-white/80 hover:bg-white/10 hover:text-white md:flex h-9 w-9"
                  onClick={onToggleSidebar}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4 text-[#D9A514]" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#E7E5DF] bg-[#0B0B0C] text-xs text-white">
                {collapsed ? "Expandir Menu (Ctrl+\\)" : "Recolher Menu (Ctrl+\\)"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Logo JANSOL OS Header */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D9A514] text-[#0B0B0C] font-black text-xs shadow-xs">
              <Sun className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black tracking-tight text-white">
                JANSOL <span className="text-[#D9A514] text-xs font-semibold">OS</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Centro: Busca Global Highlight */}
        <div className="flex flex-1 items-center justify-center px-4 max-w-md">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full max-w-sm items-center justify-between rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white/80 transition-all hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#D9A514]"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-[#D9A514]" />
              <span className="truncate">Buscar clientes, fones, cidade...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Lado Direito: Status & Profile */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operativo</span>
          </div>

          {/* User Email */}
          <span className="hidden max-w-[160px] truncate text-xs font-medium text-white/70 sm:inline">
            {userEmail || "Sistema"}
          </span>

          {/* Sair */}
          <Button
            variant="ghost"
            size="sm"
            onClick={sair}
            className="h-8 text-xs text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5 text-[#D9A514]" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
