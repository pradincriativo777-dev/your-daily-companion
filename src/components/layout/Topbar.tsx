import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Menu,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  HelpCircle,
  UserPlus,
  FileText,
  Calendar,
  CheckSquare,
  CalendarClock,
  DollarSign,
  MessageSquare,
  Bell,
  Sparkles,
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
import { JansolLogo } from "./JansolLogo";
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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#DDD8CE] bg-[#F8F6F1] px-4 text-[#24231F] shadow-xs">
        {/* Lado Esquerdo: Controls & Logo Oficial */}
        <div className="flex items-center gap-3">
          {/* Menu Mobile */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir Menu JANSOL OS"
            className="text-[#1D1C19] hover:bg-[#F2EFE8] md:hidden h-10 w-10 min-h-[44px] min-w-[44px]"
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
                  className="hidden text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] md:flex h-9 w-9 rounded-xl"
                  onClick={onToggleSidebar}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4 text-[#E3B94F]" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#DDD8CE] bg-[#1D1C19] text-xs text-[#F8F6F1]">
                {collapsed ? "Expandir Menu (Ctrl+\\)" : "Recolher Menu (Ctrl+\\)"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Logotipo Oficial JANSOL OS */}
          <Link to="/dashboard">
            <JansolLogo darkBackground={false} />
          </Link>
        </div>

        {/* Centro: Busca Ampla em Superfície Editorial + Botão + Criar com Gradiente Marca */}
        <div className="flex flex-1 items-center justify-center px-4 max-w-xl gap-3">
          {/* Botão + Criar Gradiente JANSOL (Cantos 10px) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="jansol-gradient-btn flex items-center gap-1.5 h-9 rounded-[10px] px-4 text-xs font-bold shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span className="hidden sm:inline font-bold uppercase">Criar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-[14px] border border-[#DDD8CE] bg-white p-1.5 shadow-xl">
              <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-[#706D65] px-3 py-2">
                Criação Rápida JANSOL
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#DDD8CE]" />

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_cliente", "/dashboard/clientes")}
                className="flex items-center gap-3 rounded-[10px] py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#24231F] hover:bg-[#FAF5E8] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FAF5E8] text-[#E3B94F]">
                  <UserPlus className="h-3.5 w-3.5" />
                </div>
                <span>Novo Cliente</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_ordem", "/dashboard/ordens")}
                className="flex items-center gap-3 rounded-[10px] py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#24231F] hover:bg-[#FAF5E8] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1D1C19] text-white">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span>Ordem de Serviço</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("agendar_visita", "/dashboard/agenda")}
                className="flex items-center gap-3 rounded-[10px] py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#24231F] hover:bg-[#FAF5E8] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <span>Visita Técnica</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_tarefa", "/dashboard/tarefas")}
                className="flex items-center gap-3 rounded-[10px] py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#24231F] hover:bg-[#FAF5E8] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                  <CheckSquare className="h-3.5 w-3.5" />
                </div>
                <span>Tarefa / Pendência</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_manutencao", "/dashboard/manutencoes")}
                className="flex items-center gap-3 rounded-[10px] py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#24231F] hover:bg-[#FAF5E8] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-100 text-orange-800">
                  <CalendarClock className="h-3.5 w-3.5" />
                </div>
                <span>Manutenção</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_gasto", "/dashboard/gastos")}
                className="flex items-center gap-3 rounded-[10px] py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#24231F] hover:bg-[#FAF5E8] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-200 text-stone-800">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                <span>Gasto / Despesa</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_interacao", "/dashboard/interacoes")}
                className="flex items-center gap-3 rounded-[10px] py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#24231F] hover:bg-[#FAF5E8] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-800">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <span>Interação</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Acionador da Central de Comandos Editorial Search */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="jansol-editorial-search flex h-9 w-full max-w-md items-center justify-between px-4 text-xs font-medium focus:outline-none"
          >
            <div className="flex items-center gap-2.5 truncate text-[#706D65]">
              <Search className="h-4 w-4 text-[#E3B94F]" />
              <span className="truncate">Buscar clientes, tarefas ou módulos...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[#DDD8CE] bg-white px-2 py-0.5 text-[10px] font-bold text-[#24231F] shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Lado Direito: Status, Notificações & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Notificações Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: "/dashboard/notificacoes" })}
                  className="h-9 w-9 text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] rounded-xl relative"
                  aria-label="Notificações"
                >
                  <Bell className="h-4 w-4 text-[#C8794A]" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#E3B94F]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#DDD8CE] bg-[#1D1C19] text-xs text-[#F8F6F1]">
                Notificações & Avisos
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Botão de Atalhos */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShortcutsOpen(true)}
                  className="h-9 w-9 text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] rounded-xl"
                  aria-label="Ver Atalhos de Teclado"
                >
                  <HelpCircle className="h-4 w-4 text-[#E3B94F]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#DDD8CE] bg-[#1D1C19] text-xs text-[#F8F6F1]">
                Atalhos de Teclado (?)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#E3B94F]/40 bg-[#FAF5E8] px-3 py-1 text-xs font-bold text-[#91623E]">
            <span className="h-2 w-2 rounded-full bg-[#E3B94F] animate-pulse" />
            <span>Operativo</span>
          </div>

          {/* User Email */}
          <span className="hidden max-w-[140px] truncate text-xs font-semibold text-[#706D65] sm:inline">
            {userEmail || "Sistema"}
          </span>

          {/* Sair */}
          <Button
            variant="ghost"
            size="sm"
            onClick={sair}
            className="h-8 text-xs text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] rounded-lg"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5 text-[#C8794A]" />
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
