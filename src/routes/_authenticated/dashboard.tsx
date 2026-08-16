import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  CalendarClock,
  DollarSign,
  FileSpreadsheet,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  Shield,
  ShieldCheck,
  Upload,
  User,
  Users,
  Wrench,
  Plug,
  Boxes,
  CheckCircle,
  Settings,
  CheckSquare,
  Bell,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useClientes } from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/ordens", label: "Ordens de Serviço", icon: FileText },
  { to: "/dashboard/estoque", label: "Estoque & Peças", icon: Package },
  { to: "/dashboard/equipamentos", label: "Equipamentos", icon: Package },
  { to: "/dashboard/garantias", label: "Garantias & Alertas", icon: ShieldCheck },
  { to: "/dashboard/agenda", label: "Agenda", icon: Calendar },
  { to: "/dashboard/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/dashboard/clientes", label: "Clientes", icon: Users, exact: true },
  {
    to: "/dashboard/clientes/qualidade",
    label: "Qualidade dos Dados",
    icon: ShieldCheck,
  },
  {
    to: "/dashboard/importar-clientes",
    label: "Importar Clientes",
    icon: Upload,
  },
  { to: "/dashboard/manutencoes", label: "Manutenções", icon: CalendarClock },
  { to: "/dashboard/tecnicos", label: "Técnicos", icon: Wrench },
  { to: "/dashboard/gastos", label: "Gastos", icon: DollarSign },
  { to: "/dashboard/interacoes", label: "Interações", icon: MessageSquare },
  { to: "/dashboard/relatorios", label: "Relatórios", icon: FileSpreadsheet },
  { to: "/dashboard/integracoes", label: "Integrações", icon: Plug },
  { to: "/dashboard/usuarios", label: "Usuários", icon: Users },
  { to: "/dashboard/permissoes", label: "Permissões (RBAC)", icon: Shield },
  { to: "/dashboard/tarefas", label: "Tarefas & Pendências", icon: CheckSquare },
  { to: "/dashboard/notificacoes", label: "Notificações", icon: Bell },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1 p-3">
      {NAV.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.to || pathname === `${item.to}/`
            : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function GlobalSearch() {
  const [term, setTerm] = useState("");
  const { data: clientes = [] } = useClientes();
  const q = term.trim().toLowerCase();
  const results = q
    ? clientes
        .filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.cidade ?? "").toLowerCase().includes(q) ||
            (c.whatsapp ?? "").toLowerCase().includes(q),
        )
        .slice(0, 8)
    : [];

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar cliente, telefone, cidade..."
        className="border-white/15 bg-white/10 pl-8 text-sm text-white placeholder:text-white/50"
      />
      {results.length > 0 && (
        <div className="absolute top-11 right-0 left-0 z-50 overflow-hidden rounded-md border bg-popover shadow-lg">
          {results.map((c) => (
            <Link
              key={c.id}
              to="/dashboard/clientes/$id"
              params={{ id: c.id }}
              onClick={() => setTerm("")}
              className="block px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">{c.nome}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {c.cidade ?? "—"} · {c.whatsapp ?? "sem telefone"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = Route.useRouteContext().user;

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-primary px-3 text-primary-foreground sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-white/10 md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/dashboard" className="flex items-baseline gap-2">
          <span className="text-lg font-black tracking-tight text-accent">
            JANSOL
          </span>
          <span className="hidden text-xs tracking-wide text-white/60 uppercase sm:inline">
            Painel Administrativo
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <GlobalSearch />
          <span className="hidden max-w-[180px] truncate text-xs text-white/70 lg:inline">
            {user?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={sair}
            className="text-primary-foreground hover:bg-white/10"
          >
            <LogOut className="mr-1.5 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto bg-sidebar md:block">
          <NavLinks />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 bg-sidebar p-0">
            <SheetTitle className="px-4 pt-4 text-lg font-black text-accent">
              JANSOL
            </SheetTitle>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
