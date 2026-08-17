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
import { JansolAssistenteButton } from "@/components/layout/JansolAssistenteButton";
import { JansolAssistenteDrawer } from "@/components/layout/JansolAssistenteDrawer";
import { AuvoChatPendingBanner } from "@/components/crm/AuvoChatPendingBanner";
import { AuvoChatResultadoDialog } from "@/components/crm/AuvoChatResultadoDialog";
import { AuvoChatSemTelefoneDialog } from "@/components/crm/AuvoChatSemTelefoneDialog";
import {
  getAtendimentoPendente,
  limparAtendimentoPendente,
  type AuvoChatAtendimentoState,
  type ClienteLike,
} from "@/lib/auvo-chat-assistant";
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
  const [assistenteOpen, setAssistenteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<QuickPreviewItem | null>(null);

  const assistenteButtonRef = useRef<HTMLButtonElement>(null);

  // Modais acionados pelo + Criar do cabeçalho
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [ordemModalOpen, setOrdemModalOpen] = useState(false);
  const [visitaModalOpen, setVisitaModalOpen] = useState(false);

  // Estados para Atendimento Assistido no Auvo Chat
  const [auvoAtendimentoPendente, setAuvoAtendimentoPendente] = useState<AuvoChatAtendimentoState | null>(null);
  const [auvoResultadoOpen, setAuvoResultadoOpen] = useState(false);
  const [auvoSemTelefoneOpen, setAuvoSemTelefoneOpen] = useState(false);
  const [auvoSemTelefoneCliente, setAuvoSemTelefoneCliente] = useState<ClienteLike | null>(null);

  const user = Route.useRouteContext().user;

  // Monitorar foco e visibilidade da aba para detectar retorno do Auvo Chat
  useEffect(() => {
    const checarAtendimentoPendente = () => {
      const p = getAtendimentoPendente();
      setAuvoAtendimentoPendente(p);
    };

    checarAtendimentoPendente();

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === "visible") {
        checarAtendimentoPendente();
      }
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, []);

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

  // Suporte a Atalhos de Teclado (G then D, G then C, G then A, G then O, /, Ctrl+\, Cmd+K, Cmd+J)
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

      // 2. JANSOL Assistente: ⌘J / Ctrl+J
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAssistenteOpen((prev) => !prev);
        return;
      }

      // 3. Toggle Sidebar: Ctrl+\
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (isTyping) return;

      // 4. Focar busca: /
      if (e.key === "/") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // 5. Sequência G + Tecla (Navigation Chords)
      const now = Date.now();
      const keyUpper = e.key.toUpperCase();

      if (keyUpper === "G") {
        lastGKeyTime.current = now;
        return;
      }

      if (now - lastGKeyTime.current < 1000) {
        lastGKeyTime.current = 0;
        switch (keyUpper) {
          case "D":
            navigate({ to: "/dashboard" });
            break;
          case "C":
            navigate({ to: "/dashboard/clientes" });
            break;
          case "A":
            navigate({ to: "/dashboard/agenda" });
            break;
          case "O":
            navigate({ to: "/dashboard/ordens" });
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-[#24231F]">
      {/* Cabeçalho Fixo Superior */}
      <Topbar
        collapsed={collapsed}
        onToggleSidebar={toggleSidebar}
        onOpenMobileNav={() => setMobileOpen(true)}
        userEmail={user?.email}
        onQuickAction={handleQuickAction}
      />

      {/* Corpo Principal (Sidebar + Main Content) */}
      <div className="flex">
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

      {/* JANSOL Assistente — Botão Flutuante Global & Drawer Lateral */}
      <JansolAssistenteButton
        ref={assistenteButtonRef}
        onClick={() => setAssistenteOpen(true)}
      />
      <JansolAssistenteDrawer
        open={assistenteOpen}
        onOpenChange={setAssistenteOpen}
        triggerRef={assistenteButtonRef}
      />

      {/* Aviso Flutuante de Atendimento Pendente do Auvo Chat */}
      <AuvoChatPendingBanner
        atendimento={auvoAtendimentoPendente}
        onRegistrarResultado={() => setAuvoResultadoOpen(true)}
        onContinuarDepois={() => setAuvoAtendimentoPendente(null)}
        onCancelarAtendimento={() => {
          limparAtendimentoPendente();
          setAuvoAtendimentoPendente(null);
        }}
      />

      {/* Dialog para Registrar Resultado do Auvo Chat */}
      <AuvoChatResultadoDialog
        open={auvoResultadoOpen}
        onOpenChange={(op) => {
          setAuvoResultadoOpen(op);
          if (!op) {
            setAuvoAtendimentoPendente(getAtendimentoPendente());
          }
        }}
        atendimento={auvoAtendimentoPendente}
        userEmail={user?.email}
        onTriggerCriarTarefa={() => {
          navigate({ to: "/dashboard/tarefas" });
        }}
        onTriggerCriarOS={() => {
          setOrdemModalOpen(true);
        }}
        onTriggerAgendarVisita={() => {
          setVisitaModalOpen(true);
        }}
        onNavegarFichaCliente={(clienteId) => {
          navigate({ to: "/dashboard/clientes/$id", params: { id: clienteId } });
        }}
      />

      {/* Dialog quando Cliente não possui Telefone Cadastrado */}
      <AuvoChatSemTelefoneDialog
        open={auvoSemTelefoneOpen}
        onOpenChange={setAuvoSemTelefoneOpen}
        clienteNome={auvoSemTelefoneCliente?.nome}
        onEditarCadastro={() => {
          if (auvoSemTelefoneCliente) {
            navigate({ to: "/dashboard/clientes/$id", params: { id: auvoSemTelefoneCliente.id } });
          }
        }}
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
