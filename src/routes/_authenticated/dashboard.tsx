import { useState, useEffect, useRef } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileDrawer, MobileBottomBar } from "@/components/layout/MobileNavigation";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { QuickPreviewDrawer, type QuickPreviewItem } from "@/components/crm/QuickPreviewDrawer";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { OrdemServicoDialog } from "@/components/crm/OrdemServicoDialog";
import { AgendarVisitaDialog } from "@/components/crm/AgendarVisitaDialog";
import { useClientes, useTecnicos } from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jansol_sidebar_collapsed") === "true";
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<QuickPreviewItem | null>(null);

  // Modais acionados pelo + Criar do cabeçalho
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [ordemModalOpen, setOrdemModalOpen] = useState(false);
  const [visitaModalOpen, setVisitaModalOpen] = useState(false);

  const user = Route.useRouteContext().user;

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("jansol_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  const handleQuickAction = (actionKey: string) => {
    switch (actionKey) {
      case "novo_cliente":
        setClienteModalOpen(true);
        break;
      case "nova_ordem":
        setOrdemModalOpen(true);
        break;
      case "agendar_visita":
        setVisitaModalOpen(true);
        break;
      case "nova_tarefa":
        navigate({ to: "/dashboard/tarefas" });
        break;
      case "nova_manutencao":
        navigate({ to: "/dashboard/manutencoes" });
        break;
      case "novo_gasto":
        navigate({ to: "/dashboard/gastos" });
        break;
      case "nova_interacao":
        navigate({ to: "/dashboard/interacoes" });
        break;
      default:
        break;
    }
  };

  // Suporte a Atalhos de Teclado (G then D, G then C, G then A, G then O, /, Ctrl+\, Cmd+K)
  const lastGKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar atalhos se o usuário estiver digitando em um input, textarea ou editor
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      // 1. Command Palette: ⌘K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Toggle Sidebar: Ctrl+\
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (isTyping) return;

      // 3. Focar busca: /
      if (e.key === "/") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // 4. Sequência G + Tecla (Navigation Chords)
      const now = Date.now();
      const keyUpper = e.key.toUpperCase();

      if (keyUpper === "G") {
        lastGKeyTime.current = now;
        return;
      }

      if (now - lastGKeyTime.current < 1000) {
        if (keyUpper === "D") {
          e.preventDefault();
          navigate({ to: "/dashboard" });
        } else if (keyUpper === "C") {
          e.preventDefault();
          navigate({ to: "/dashboard/clientes" });
        } else if (keyUpper === "A") {
          e.preventDefault();
          navigate({ to: "/dashboard/agenda" });
        } else if (keyUpper === "O") {
          e.preventDefault();
          navigate({ to: "/dashboard/ordens" });
        }
        lastGKeyTime.current = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#171716] flex flex-col selection:bg-[#FAF3D6] selection:text-[#0B0B0C]">
      {/* Cabeçalho Topbar */}
      <Topbar
        collapsed={collapsed}
        onToggleSidebar={toggleSidebar}
        onOpenMobileNav={() => setMobileOpen(true)}
        userEmail={user?.email}
        onQuickAction={handleQuickAction}
      />

      {/* Corpo Principal */}
      <div className="flex flex-1 min-h-[calc(100vh-3.75rem)]">
        {/* Sidebar Desktop */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Drawer Mobile */}
        <MobileDrawer
          open={mobileOpen}
          onOpenChange={setMobileOpen}
        />

        {/* Área de Conteúdo */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Barra Inferior para iPhone */}
      <MobileBottomBar onOpenSearch={() => setCommandPaletteOpen(true)} />

      {/* Central de Comandos Universal */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onTriggerQuickAction={handleQuickAction}
      />

      {/* Painel de Resumo Rápido Lateral */}
      <QuickPreviewDrawer
        item={previewItem}
        onOpenChange={() => setPreviewItem(null)}
      />

      {/* Modais Globais de Criação */}
      <ClienteDialog
        open={clienteModalOpen}
        onOpenChange={setClienteModalOpen}
      />
      <OrdemServicoDialog
        open={ordemModalOpen}
        onOpenChange={setOrdemModalOpen}
        clientes={clientes}
        tecnicos={tecnicos}
        onSave={async () => {
          navigate({ to: "/dashboard/ordens" });
        }}
      />
      <AgendarVisitaDialog
        open={visitaModalOpen}
        onOpenChange={setVisitaModalOpen}
      />
    </div>
  );
}
