import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Bell,
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
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface NavGroup {
  title: string;
  items: {
    to: string;
    label: string;
    icon: any;
    exact?: boolean;
    badge?: string;
  }[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "OPERAÇÃO",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/dashboard/ordens", label: "Ordens de Serviço", icon: FileText },
      { to: "/dashboard/agenda", label: "Agenda", icon: Calendar },
      { to: "/dashboard/tarefas", label: "Tarefas", icon: CheckSquare },
      { to: "/dashboard/notificacoes", label: "Notificações", icon: Bell },
    ],
  },
  {
    title: "CLIENTES",
    items: [
      { to: "/dashboard/clientes", label: "Clientes", icon: Users, exact: true },
      { to: "/dashboard/kanban", label: "Kanban", icon: KanbanSquare },
      { to: "/dashboard/interacoes", label: "Interações", icon: MessageSquare },
      { to: "/dashboard/clientes/qualidade", label: "Qualidade dos Dados", icon: ShieldCheck },
      { to: "/dashboard/importar-clientes", label: "Importar Clientes", icon: Upload },
    ],
  },
  {
    title: "TÉCNICO",
    items: [
      { to: "/dashboard/equipamentos", label: "Equipamentos", icon: Package },
      { to: "/dashboard/garantias", label: "Garantias", icon: Shield },
      { to: "/dashboard/manutencoes", label: "Manutenções", icon: CalendarClock },
      { to: "/dashboard/tecnicos", label: "Técnicos", icon: Wrench },
    ],
  },
  {
    title: "GESTÃO",
    items: [
      { to: "/dashboard/estoque", label: "Estoque", icon: Boxes },
      { to: "/dashboard/gastos", label: "Gastos", icon: DollarSign },
      { to: "/dashboard/relatorios", label: "Relatórios", icon: FileSpreadsheet },
      { to: "/dashboard/integracoes", label: "Integrações", icon: Plug },
    ],
  },
  {
    title: "ADMINISTRAÇÃO",
    items: [
      { to: "/dashboard/usuarios", label: "Usuários", icon: Users },
      { to: "/dashboard/permissoes", label: "Permissões", icon: Shield },
      { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "sticky top-15 hidden h-[calc(100vh-3.75rem)] shrink-0 flex-col border-r border-[#242426] bg-[#0B0B0C] text-[#E7E5DF] transition-all duration-200 ease-in-out md:flex",
          collapsed ? "w-18" : "w-68"
        )}
      >
        {/* Brand Header inside Sidebar */}
        <div className="flex h-12 items-center justify-between px-4 border-b border-[#242426]/60">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9A514]">
                Navegação
              </span>
            </div>
          ) : (
            <div className="mx-auto flex h-6 w-6 items-center justify-center rounded bg-[#D9A514]/20 text-[#D9A514]">
              <Sun className="h-3.5 w-3.5" />
            </div>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="hidden md:flex h-6 w-6 items-center justify-center rounded-md text-[#8E8D88] hover:bg-white/10 hover:text-white transition-colors"
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-[#8E8D88]">
                  {group.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.to || pathname === `${item.to}/`
                    : pathname.startsWith(item.to);

                  const linkContent = (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 relative",
                        active
                          ? "bg-[#FAF3D6] text-[#0B0B0C] font-semibold shadow-xs"
                          : "text-[#E7E5DF]/80 hover:bg-white/8 hover:text-white"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active
                            ? "text-[#D9A514]"
                            : "text-[#8E8D88] group-hover:text-white"
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {active && !collapsed && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D9A514]" />
                      )}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#171716] text-white border-[#242426] text-xs font-semibold">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        {!collapsed && (
          <div className="border-t border-[#242426]/60 p-3 text-[11px] text-[#8E8D88]">
            <div className="flex items-center justify-between">
              <span>JANSOL OS v2.0</span>
              <span className="text-[#D9A514]">Solar Tech</span>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
