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
  Bell,
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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E7E5EE] bg-[#100D3F] px-4 text-white shadow-xs">
        {/* Lado Esquerdo: Controls & Brand Logo */}
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
                  className="hidden text-white/80 hover:bg-white/10 hover:text-white md:flex h-9 w-9 rounded-xl"
                  onClick={onToggleSidebar}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4 text-[#55D6C2]" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#1F1B5C] bg-[#09072A] text-xs text-white">
                {collapsed ? "Expandir Menu (Ctrl+\\)" : "Recolher Menu (Ctrl+\\)"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Logo JANSOL OS Kommo-Inspired */}
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD95A] to-[#8DE3C9] text-[#100D3F] font-black shadow-xs">
              <Sun className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black tracking-tight text-white">
                JANSOL <span className="text-[#55D6C2] text-xs font-semibold">OS</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Centro: Busca Global Larga Kommo Pill + Botão + Criar com Gradiente JANSOL */}
        <div className="flex flex-1 items-center justify-center px-4 max-w-xl gap-3">
          {/* Botão + Criar Gradiente JANSOL (Pill) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="jansol-gradient-btn flex items-center gap-1.5 h-10 rounded-full px-4 text-xs tracking-wide shadow-md shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span className="hidden sm:inline font-black uppercase">Criar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-2xl border border-[#E7E5EE] bg-white p-1.5 shadow-2xl">
              <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-[#6F6C80] px-3 py-2">
                Criação Rápida Kommo
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E7E5EE]" />

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_cliente", "/dashboard/clientes")}
                className="flex items-center gap-3 rounded-xl py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#17152B] hover:bg-[#EBF8F5] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFF9E6] text-[#E2B321]">
                  <UserPlus className="h-3.5 w-3.5" />
                </div>
                <span>Novo Cliente</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_ordem", "/dashboard/ordens")}
                className="flex items-center gap-3 rounded-xl py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#17152B] hover:bg-[#EBF8F5] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#100D3F] text-white">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <span>Ordem de Serviço</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("agendar_visita", "/dashboard/agenda")}
                className="flex items-center gap-3 rounded-xl py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#17152B] hover:bg-[#EBF8F5] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <span>Visita Técnica</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_tarefa", "/dashboard/tarefas")}
                className="flex items-center gap-3 rounded-xl py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#17152B] hover:bg-[#EBF8F5] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckSquare className="h-3.5 w-3.5" />
                </div>
                <span>Tarefa / Pendência</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_manutencao", "/dashboard/manutencoes")}
                className="flex items-center gap-3 rounded-xl py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#17152B] hover:bg-[#EBF8F5] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                </div>
                <span>Manutenção</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_gasto", "/dashboard/gastos")}
                className="flex items-center gap-3 rounded-xl py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#17152B] hover:bg-[#EBF8F5] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                <span>Gasto / Despesa</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_interacao", "/dashboard/interacoes")}
                className="flex items-center gap-3 rounded-xl py-2.5 px-3 cursor-pointer font-semibold text-xs text-[#17152B] hover:bg-[#EBF8F5] transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <span>Interação</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Acionador da Central de Comandos Pill */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex h-10 w-full max-w-md items-center justify-between rounded-full border border-white/20 bg-white/10 px-4 text-xs text-white/90 transition-all hover:border-[#55D6C2] hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#55D6C2]"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="h-4 w-4 text-[#55D6C2]" />
              <span className="truncate font-medium">Buscar clientes, tarefas ou módulos...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">
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
                  className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white rounded-xl relative"
                  aria-label="Notificações"
                >
                  <Bell className="h-4 w-4 text-[#FFD95A]" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#55D6C2]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#1F1B5C] bg-[#09072A] text-xs text-white">
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
                  className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white rounded-xl"
                  aria-label="Ver Atalhos de Teclado"
                >
                  <HelpCircle className="h-4 w-4 text-[#55D6C2]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#1F1B5C] bg-[#09072A] text-xs text-white">
                Atalhos de Teclado (?)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#55D6C2]/40 bg-[#55D6C2]/15 px-3 py-1 text-xs font-semibold text-[#55D6C2]">
            <span className="h-2 w-2 rounded-full bg-[#55D6C2] animate-pulse" />
            <span>Operativo</span>
          </div>

          {/* User Email */}
          <span className="hidden max-w-[140px] truncate text-xs font-medium text-white/80 sm:inline">
            {userEmail || "Sistema"}
          </span>

          {/* Sair */}
          <Button
            variant="ghost"
            size="sm"
            onClick={sair}
            className="h-8 text-xs text-white/80 hover:bg-white/10 hover:text-white rounded-xl"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5 text-[#FFD95A]" />
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
