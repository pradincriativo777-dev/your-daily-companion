import { useState, useEffect } from "react";
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
  ExternalLink,
} from "lucide-react";
import { AUVO_CHAT_URL } from "@/lib/config";
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
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  // Keyboard shortcut 'C' for + Criar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "c" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const target = e.target as HTMLElement | null;
        const isInput =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          setCreateMenuOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E2DDD0]/80 bg-[#F8F6F1] px-4 text-[#24231F]">
        {/* Lado Esquerdo: Toggle & Logo Oficial */}
        <div className="flex items-center gap-2.5">
          {/* Menu Mobile */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir Menu"
            className="text-[#1D1C19] hover:bg-[#F2EFE8] md:hidden h-9 w-9 min-h-[44px] min-w-[44px]"
            onClick={onOpenMobileNav}
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Toggle Sidebar Desktop */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={collapsed ? "Expandir Menu" : "Recolher Menu"}
                  className="hidden text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] md:flex h-8 w-8 rounded-lg"
                  onClick={onToggleSidebar}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4 text-[#E3B94F]" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#E2DDD0] bg-[#1D1C19] text-[11px] text-[#F8F6F1]">
                {collapsed ? "Expandir (Ctrl+\\)" : "Recolher (Ctrl+\\)"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Logotipo Oficial JANSOL OS */}
          <Link to="/dashboard">
            <JansolLogo collapsed={collapsed} darkBackground={false} />
          </Link>
        </div>

        {/* Centro: Busca Ampla Editorial + Único Botão Dourado (+ Criar) */}
        <div className="flex flex-1 items-center justify-center px-4 max-w-lg gap-2.5">
          {/* Botão + Criar: O ÚNICO BOTÃO DOURADO PRINCIPAL NO TOPO (Atalho 'C') */}
          <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="jansol-gradient-btn flex items-center gap-1.5 h-8 rounded-md px-3 text-xs font-bold shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 stroke-[3]" />
                <span className="hidden sm:inline uppercase tracking-wide">Criar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl border border-[#E2DDD0] bg-white p-1 shadow-md">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-[#706D65] px-2.5 py-1.5">
                Criação Rápida
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E2DDD0]" />

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_cliente", "/dashboard/clientes")}
                className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]"
              >
                <UserPlus className="h-3.5 w-3.5 text-[#C8794A]" />
                <span>Novo Cliente</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_ordem", "/dashboard/ordens")}
                className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]"
              >
                <FileText className="h-3.5 w-3.5 text-[#1D1C19]" />
                <span>Ordem de Serviço</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("agendar_visita", "/dashboard/agenda")}
                className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]"
              >
                <Calendar className="h-3.5 w-3.5 text-[#C8794A]" />
                <span>Visita Técnica</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_tarefa", "/dashboard/tarefas")}
                className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]"
              >
                <CheckSquare className="h-3.5 w-3.5 text-emerald-700" />
                <span>Tarefa / Pendência</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_manutencao", "/dashboard/manutencoes")}
                className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]"
              >
                <CalendarClock className="h-3.5 w-3.5 text-amber-700" />
                <span>Manutenção</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("novo_gasto", "/dashboard/gastos")}
                className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]"
              >
                <DollarSign className="h-3.5 w-3.5 text-stone-700" />
                <span>Gasto / Despesa</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => handleCreateOption("nova_interacao", "/dashboard/interacoes")}
                className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]"
              >
                <MessageSquare className="h-3.5 w-3.5 text-purple-700" />
                <span>Interação</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Acionador da Central de Comandos Editorial Search */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="jansol-editorial-search flex h-8 w-full max-w-md items-center justify-between px-3 text-xs focus:outline-none"
          >
            <div className="flex items-center gap-2 truncate text-[#706D65]">
              <Search className="h-3.5 w-3.5 text-[#706D65]" />
              <span className="truncate">Buscar clientes, tarefas ou módulos...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-[#E2DDD0] bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#24231F]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Lado Direito: Ações Secundárias em Ícones Neutros com Tooltips */}
        <div className="flex items-center gap-1.5">
          {/* Atalho Auvo Chat em Nova Aba */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={AUVO_CHAT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir Auvo Chat em uma nova aba"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] relative transition-colors"
                >
                  <MessageSquare className="h-4 w-4 text-[#C8794A]" />
                  <ExternalLink className="absolute top-1.5 right-1.5 h-2.5 w-2.5 text-[#8E8C82]" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#E2DDD0] bg-[#1D1C19] text-[11px] text-[#F8F6F1]">
                Abrir Auvo Chat
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Notificações Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: "/dashboard/notificacoes" })}
                  className="h-8 w-8 text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] rounded-lg relative"
                  aria-label="Notificações"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#C8794A]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#E2DDD0] bg-[#1D1C19] text-[11px] text-[#F8F6F1]">
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
                  className="h-8 w-8 text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#1D1C19] rounded-lg"
                  aria-label="Ver Atalhos de Teclado"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#E2DDD0] bg-[#1D1C19] text-[11px] text-[#F8F6F1]">
                Atalhos de Teclado (?)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User Email */}
          <span className="hidden max-w-[130px] truncate text-xs font-medium text-[#706D65] sm:inline pl-1">
            {userEmail || "Sistema"}
          </span>

          {/* Sair */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={sair}
                  className="h-8 w-8 text-[#706D65] hover:bg-[#F2EFE8] hover:text-[#C53030] rounded-lg"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-[#E2DDD0] bg-[#1D1C19] text-[11px] text-[#F8F6F1]">
                Sair da Conta
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
