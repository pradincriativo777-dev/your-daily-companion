import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Users,
  KanbanSquare,
  MessageSquare,
  ShieldCheck,
  Upload,
  Package,
  Shield,
  CalendarClock,
  Wrench,
  Boxes,
  DollarSign,
  FileSpreadsheet,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  LayoutGrid,
  UserPlus,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { JansolLogo } from "./JansolLogo";
import { TodosModulosSheet } from "./TodosModulosSheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const MAIN_SHORTCUTS = [
  { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/clientes", label: "Clientes", icon: Users },
  { to: "/dashboard/ordens", label: "Ordens de Serviço", icon: FileText },
  { to: "/dashboard/agenda", label: "Agenda", icon: Calendar },
  { to: "/dashboard/tarefas", label: "Tarefas", icon: CheckSquare },
];

export const ACCORDION_GROUPS = [
  {
    id: "relacionamento",
    title: "Relacionamento",
    icon: MessageSquare,
    items: [
      { to: "/dashboard/kanban", label: "Kanban", icon: KanbanSquare },
      { to: "/dashboard/interacoes", label: "Interações", icon: MessageSquare },
      { to: "/dashboard/clientes/qualidade", label: "Qualidade de dados", icon: ShieldCheck },
      { to: "/dashboard/importar-clientes", label: "Importar clientes", icon: Upload },
    ],
  },
  {
    id: "operacao_tecnica",
    title: "Operação técnica",
    icon: Wrench,
    items: [
      { to: "/dashboard/tecnicos", label: "Técnicos", icon: Wrench },
      { to: "/dashboard/manutencoes", label: "Manutenções", icon: CalendarClock },
      { to: "/dashboard/equipamentos", label: "Equipamentos", icon: Package },
      { to: "/dashboard/garantias", label: "Garantias", icon: Shield },
    ],
  },
  {
    id: "gestao",
    title: "Gestão",
    icon: DollarSign,
    items: [
      { to: "/dashboard/estoque", label: "Estoque", icon: Boxes },
      { to: "/dashboard/gastos", label: "Despesas", icon: DollarSign },
      { to: "/dashboard/relatorios", label: "Relatórios", icon: FileSpreadsheet },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    icon: Settings,
    items: [
      { to: "/dashboard/integracoes", label: "Integrações", icon: Plug },
      { to: "/dashboard/usuarios", label: "Usuários", icon: Users },
      { to: "/dashboard/permissoes", label: "Permissões", icon: Shield },
      { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

// Compatibilidade com MobileNavigation original (se precisar)
export const NAV_GROUPS = [
  { title: "PRINCIPAL", items: MAIN_SHORTCUTS },
  ...ACCORDION_GROUPS.map(g => ({ title: g.title, items: g.items }))
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
  userEmail,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  userEmail?: string | undefined;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [todosModulosOpen, setTodosModulosOpen] = useState(false);

  // Check if a secondary module is active (not one of the MAIN_SHORTCUTS)
  const isSecondaryActive = ACCORDION_GROUPS.some(group => 
    group.items.some((item: any) => 
      item.exact ? pathname === item.to || pathname === `${item.to}/` : pathname.startsWith(item.to)
    )
  );

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const handleCreateOption = (action: string, path: string) => {
    setCreateMenuOpen(false);
    navigate({ to: path });
    // TODO: Disparar modal de criação de acordo com a action.
    // Atualmente estamos apenas navegando para as listagens, igual ao antigo comportamento.
  };

  const renderMainLink = (item: any) => {
    const active = item.exact
      ? pathname === item.to || pathname === `${item.to}/`
      : pathname.startsWith(item.to);

    const linkContent = (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#E3B94F]",
          active
            ? "bg-[#2A2825] text-white border-l-2 border-[#E3B94F]"
            : "text-[#A8A59E] hover:bg-[#2A2825]/50 hover:text-white"
        )}
      >
        <item.icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            active ? "text-[#E3B94F]" : "text-[#8E8C82] group-hover:text-white"
          )}
        />
        {!collapsed && (
          <span className="truncate flex-1 font-medium">{item.label}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.to}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="bg-[#11110F] text-[#F8F6F1] border-[#38352F] text-xs font-semibold">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "hidden md:flex h-screen shrink-0 flex-col border-r border-[#2B2924] bg-[#1D1C19] text-[#F8F6F1] transition-all duration-200 ease-in-out",
          collapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
        {/* Brand Header inside Sidebar */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <JansolLogo collapsed={collapsed} darkBackground={true} />

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className={cn(
                "hidden md:flex h-6 w-6 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white transition-colors shrink-0",
                collapsed ? "mx-auto" : ""
              )}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Create Button area */}
        <div className="px-3 pt-2 pb-4">
          <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className={cn(
                      "jansol-gradient-btn flex items-center justify-center h-9 w-full rounded-md font-bold shrink-0 cursor-pointer shadow-sm hover:shadow-md transition-all",
                      collapsed ? "px-0" : "px-3 gap-2"
                    )}
                  >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    {!collapsed && <span className="uppercase tracking-wide text-xs">Criar</span>}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="bg-[#11110F] text-[#F8F6F1] border-[#38352F] text-xs font-semibold">
                  Criar novo
                </TooltipContent>
              )}
            </Tooltip>
            <DropdownMenuContent align={collapsed ? "start" : "center"} side={collapsed ? "right" : "bottom"} className="w-52 rounded-xl border border-[#E2DDD0] bg-white p-1 shadow-lg ml-2 md:ml-0">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-[#706D65] px-2.5 py-1.5">
                Criação Rápida
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E2DDD0]" />
              <DropdownMenuItem onClick={() => handleCreateOption("novo_cliente", "/dashboard/clientes")} className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]">
                <UserPlus className="h-3.5 w-3.5 text-[#C8794A]" /><span>Novo Cliente</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption("nova_ordem", "/dashboard/ordens")} className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]">
                <FileText className="h-3.5 w-3.5 text-[#1D1C19]" /><span>Ordem de Serviço</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption("agendar_visita", "/dashboard/agenda")} className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]">
                <Calendar className="h-3.5 w-3.5 text-[#C8794A]" /><span>Visita Técnica</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption("nova_tarefa", "/dashboard/tarefas")} className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-700" /><span>Tarefa / Pendência</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption("nova_interacao", "/dashboard/interacoes")} className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]">
                <MessageSquare className="h-3.5 w-3.5 text-purple-700" /><span>Interação</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateOption("novo_gasto", "/dashboard/gastos")} className="flex items-center gap-2.5 rounded-lg py-2 px-2.5 cursor-pointer font-medium text-xs text-[#24231F] hover:bg-[#FAF5E8]">
                <DollarSign className="h-3.5 w-3.5 text-stone-700" /><span>Gasto / Despesa</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
          {MAIN_SHORTCUTS.map((item) => renderMainLink(item))}

          <div className="pt-4 pb-2">
            <div className="h-px bg-[#2B2924] w-full" />
          </div>

          {/* Botão Todos os Módulos */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTodosModulosOpen(true)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#E3B94F]",
                  isSecondaryActive
                    ? "bg-[#2A2825] text-white border-l-2 border-[#E3B94F]"
                    : "text-[#A8A59E] hover:bg-[#2A2825]/50 hover:text-white"
                )}
              >
                <LayoutGrid
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isSecondaryActive ? "text-[#E3B94F]" : "text-[#8E8C82] group-hover:text-white"
                  )}
                />
                {!collapsed && (
                  <span className="truncate flex-1 text-left font-medium">Todos os módulos</span>
                )}
                {!collapsed && (
                  <ChevronRight className="h-4 w-4 text-[#8E8C82] group-hover:text-white transition-colors" />
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="bg-[#11110F] text-[#F8F6F1] border-[#38352F] text-xs font-semibold">
                Todos os módulos
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Footer shortcuts */}
        <div className="shrink-0 border-t border-[#2B2924] p-3 space-y-1">
          {/* Auvo Chat */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="group flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-sm font-medium text-[#A8A59E] hover:bg-[#2A2825]/50 hover:text-white transition-all duration-200">
                <MessageCircle className="h-[18px] w-[18px] shrink-0 text-[#8E8C82] group-hover:text-white" />
                {!collapsed && <span className="truncate flex-1 text-left">Auvo Chat</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="bg-[#11110F] text-[#F8F6F1] border-[#38352F] text-xs font-semibold">
                Auvo Chat
              </TooltipContent>
            )}
          </Tooltip>

          {/* Ajuda */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="group flex w-full items-center gap-3 rounded-[6px] px-3 py-2 text-sm font-medium text-[#A8A59E] hover:bg-[#2A2825]/50 hover:text-white transition-all duration-200">
                <HelpCircle className="h-[18px] w-[18px] shrink-0 text-[#8E8C82] group-hover:text-white" />
                {!collapsed && <span className="truncate flex-1 text-left">Ajuda</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="bg-[#11110F] text-[#F8F6F1] border-[#38352F] text-xs font-semibold">
                Ajuda
              </TooltipContent>
            )}
          </Tooltip>

          <div className="pt-2">
            <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2 px-1")}>
              {!collapsed && (
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-xs font-semibold text-[#E2DDD0]">
                    {userEmail?.split('@')[0] || "Usuário"}
                  </span>
                  <span className="truncate text-[10px] text-[#8E8C82]">v1.0.8</span>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={sair}
                    aria-label="Sair do sistema"
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2B2924]/50 text-[#8E8C82] hover:bg-[#C53030] hover:text-white transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="bg-[#11110F] text-[#F8F6F1] border-[#38352F] text-xs font-semibold">
                    Sair
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>

      <TodosModulosSheet
        open={todosModulosOpen}
        onOpenChange={setTodosModulosOpen}
        onNavigate={onNavigate}
        currentPath={pathname}
      />
    </TooltipProvider>
  );
}
