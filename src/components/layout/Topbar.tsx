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
  Plus,
  HelpCircle,
  UserPlus,
  FileText,
  Calendar,
  CheckSquare,
  CalendarClock,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

export function Topbar({
  collapsed,
  onToggleSidebar,
  onOpenMobileNav,
  userEmail,
  onQuickAction,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
  userEmail?: string | undefined;
  onQuickAction?: (actionKey: string) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const handleCreateOption = (actionKey: string, fallbackRoute?: string) => {
    if (onQuickAction) {
      onQuickAction(actionKey);
    } else if (fallbackRoute) {
      navigate({ to: fallbackRoute as any });
    }
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

        {/* Centro: Busca Global & Botão + Criar */}
        <div className="flex flex-1 items-center justify-center px-4 max-w-lg gap-2">
          {/* Botão + Criar Elegante */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-[#D9A514] font-semibold text-[#0B0B0C] hover:bg-[#C2930F] shadow-xs gap-1.5 h-9 rounded-xl px-3 border border-[#D9A514]/40 shrink-0"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Criar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl border border-[#E7E5DF] bg-white p-1 shadow-xl">
              <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-[#8E8D88] px-2 py-1.5">
                Criação Rápida
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E7E5DF]" />

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_cliente", "/dashboard/clientes")}
                className="flex items-center gap-2.5 rounded-lg py-2 cursor-pointer font-medium text-xs text-[#0B0B0C] hover:bg-[#FAF3D6]"
              >
                <UserPlus className="h-4 w-4 text-[#D9A514]" />
                <span>Cliente</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_ordem", "/dashboard/ordens")}
                className="flex items-center gap-2.5 rounded-lg py-2 cursor-pointer font-medium text-xs text-[#0B0B0C] hover:bg-[#FAF3D6]"
              >
                <FileText className="h-4 w-4 text-[#0B0B0C]" />
                <span>Ordem de Serviço</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("agendar_visita", "/dashboard/agenda")}
                className="flex items-center gap-2.5 rounded-lg py-2 cursor-pointer font-medium text-xs text-[#0B0B0C] hover:bg-[#FAF3D6]"
              >
                <Calendar className="h-4 w-4 text-sky-600" />
                <span>Visita Técnica</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_tarefa", "/dashboard/tarefas")}
                className="flex items-center gap-2.5 rounded-lg py-2 cursor-pointer font-medium text-xs text-[#0B0B0C] hover:bg-[#FAF3D6]"
              >
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                <span>Tarefa / Pendência</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_manutencao", "/dashboard/manutencoes")}
                className="flex items-center gap-2.5 rounded-lg py-2 cursor-pointer font-medium text-xs text-[#0B0B0C] hover:bg-[#FAF3D6]"
              >
                <CalendarClock className="h-4 w-4 text-amber-600" />
                <span>Manutenção</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_gasto", "/dashboard/gastos")}
                className="flex items-center gap-2.5 rounded-lg py-2 cursor-pointer font-medium text-xs text-[#0B0B0C] hover:bg-[#FAF3D6]"
              >
                <DollarSign className="h-4 w-4 text-[#E65100]" />
                <span>Gasto / Despesa</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_interacao", "/dashboard/interacoes")}
                className="flex items-center gap-2.5 rounded-lg py-2 cursor-pointer font-medium text-xs text-[#0B0B0C] hover:bg-[#FAF3D6]"
              >
                <MessageSquare className="h-4 w-4 text-purple-600" />
                <span>Interação</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Acionador da Central de Comandos */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex h-9 w-full max-w-sm items-center justify-between rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white/80 transition-all hover:border-white/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#D9A514]"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-[#D9A514]" />
              <span className="truncate">Central de Comandos...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Lado Direito: Status, Atalhos & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Botão de Atalhos */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShortcutsOpen(true)}
                  className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Ver Atalhos de Teclado"
                >
                  <HelpCircle className="h-4 w-4 text-[#D9A514]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#E7E5DF] bg-[#0B0B0C] text-xs text-white">
                Atalhos de Teclado (?)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operativo</span>
          </div>

          {/* User Email */}
          <span className="hidden max-w-[140px] truncate text-xs font-medium text-white/70 sm:inline">
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

      {/* Central de Comandos Universal */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onTriggerQuickAction={onQuickAction}
      />

      {/* Diálogo de Atalhos de Teclado */}
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </>
  );
}
