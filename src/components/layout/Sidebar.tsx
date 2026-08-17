import { useState, useEffect } from "react";
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
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { JansolLogo } from "./JansolLogo";

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

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Auto-expand group based on active route
  useEffect(() => {
    let foundGroup = null;
    for (const group of ACCORDION_GROUPS) {
      const isActive = group.items.some((item: any) =>
        item.exact ? pathname === item.to || pathname === `${item.to}/` : pathname.startsWith(item.to)
      );
      if (isActive) {
        foundGroup = group.id;
        break;
      }
    }
    
    // Only auto-expand if no user interaction overridden it (or always enforce it on route change)
    if (foundGroup) {
      setExpandedGroup(foundGroup);
    }
  }, [pathname]);

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const renderLink = (item: any, isAccordionChild = false) => {
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
          collapsed ? "w-[72px]" : "w-[260px]"
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

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* 5 Atalhos Principais */}
          <div className="space-y-0.5">
            {MAIN_SHORTCUTS.map(item => renderLink(item))}
          </div>

          {/* Separator */}
          <div className="h-px w-full bg-[#2B2924]" />

          {/* Grupos Recolhíveis (Accordions) */}
          <div className="space-y-1">
            {ACCORDION_GROUPS.map((group) => {
              const isExpanded = expandedGroup === group.id;
              
              if (collapsed) {
                return (
                  <div key={group.id} className="space-y-0.5 mb-4">
                    {group.items.map(item => renderLink(item))}
                  </div>
                );
              }

              return (
                <div key={group.id} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-[#99958C] hover:text-white transition-colors rounded-md hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[#E3B94F]"
                  >
                    <div className="flex items-center gap-2">
                      {/* Optional discrete icon for the group if needed, but the prompt says 'ícone discreto e seta' */}
                      <group.icon className="h-3.5 w-3.5 opacity-70" />
                      <span>{group.title}</span>
                    </div>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 opacity-70", isExpanded && "rotate-180")} />
                  </button>

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200 ease-in-out pl-2 border-l border-[#2B2924] ml-4 mt-1 space-y-0.5",
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    {group.items.map(item => renderLink(item, true))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info - Compact */}
        <div className="shrink-0 border-t border-[#2B2924] p-3">
          {collapsed ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={sair}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2B2924] text-[#E3B94F] hover:bg-[#C53030] hover:text-white transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#11110F] text-[#F8F6F1] border-[#38352F] text-xs">
                  Sair do sistema
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-[#F8F6F1] max-w-[140px] truncate">
                  {userEmail || "Sistema"}
                </span>
                <span className="text-[10px] text-[#706D65]">
                  v2.0
                </span>
              </div>
              <button
                onClick={sair}
                aria-label="Sair do sistema"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2B2924]/50 text-[#99958C] hover:bg-[#C53030] hover:text-white transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
