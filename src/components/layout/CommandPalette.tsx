import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  User,
  FileText,
  Calendar,
  CheckSquare,
  DollarSign,
  MessageSquare,
  Package,
  Boxes,
  Users,
  KanbanSquare,
  Shield,
  ShieldCheck,
  Upload,
  CalendarClock,
  Wrench,
  FileSpreadsheet,
  Plug,
  Settings,
  Bell,
  LayoutDashboard,
  Clock,
  Trash2,
  Plus,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { AUVO_CHAT_URL } from "@/lib/config";
import { useClientes } from "@/hooks/use-crm";

export interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  type: "cliente" | "modulo" | "ordem" | "tarefa";
  timestamp: number;
}

const RECENT_ITEMS_KEY = "jansol_recent_items";

export function getRecentItems(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentItem(item: Omit<RecentItem, "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentItems();
    const filtered = current.filter((i) => i.id !== item.id && i.path !== item.path);
    const updated: RecentItem[] = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, 8); // Máximo 8 itens
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function clearRecentItems() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_ITEMS_KEY);
}

export function CommandPalette({
  open,
  onOpenChange,
  onTriggerQuickAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriggerQuickAction?: ((actionKey: string) => void) | undefined;
}) {
  const navigate = useNavigate();
  const { data: clientes = [] } = useClientes();
  const [search, setSearch] = useState("");
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    if (open) {
      setRecents(getRecentItems());
    }
  }, [open]);

  const handleSelectRecent = (item: RecentItem) => {
    onOpenChange(false);
    navigate({ to: item.path as any });
  };

  const handleSelectClient = (c: any) => {
    addRecentItem({
      id: c.id,
      title: c.nome,
      subtitle: `${c.cidade ?? "Sem cidade"} · ${c.whatsapp ?? "Sem fone"}`,
      path: `/dashboard/clientes/${c.id}`,
      type: "cliente",
    });
    onOpenChange(false);
    navigate({ to: "/dashboard/clientes/$id", params: { id: c.id } });
  };

  const handleSelectModule = (to: string, label: string) => {
    addRecentItem({
      id: to,
      title: label,
      path: to,
      type: "modulo",
    });
    onOpenChange(false);
    navigate({ to: to as any });
  };

  const handleAction = (actionKey: string) => {
    onOpenChange(false);
    if (onTriggerQuickAction) {
      onTriggerQuickAction(actionKey);
    }
  };

  const handleClearRecents = () => {
    clearRecentItems();
    setRecents([]);
  };

  // Async Client Search (Client-Side Incremental Filter)
  const q = search.trim().toLowerCase();
  const clientResults = q
    ? clientes
        .filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.cidade ?? "").toLowerCase().includes(q) ||
            (c.whatsapp ?? "").toLowerCase().includes(q)
        )
        .slice(0, 8)
    : [];

  const modules = [
    { to: "/dashboard", label: "Dashboard Executivo", icon: LayoutDashboard, category: "Operação" },
    { to: "/dashboard/ordens", label: "Ordens de Serviço", icon: FileText, category: "Operação" },
    { to: "/dashboard/agenda", label: "Agenda de Visitas", icon: Calendar, category: "Operação" },
    { to: "/dashboard/tarefas", label: "Tarefas & Pendências", icon: CheckSquare, category: "Operação" },
    { to: "/dashboard/notificacoes", label: "Notificações", icon: Bell, category: "Operação" },
    { to: "/dashboard/clientes", label: "Clientes", icon: Users, category: "Clientes" },
    { to: "/dashboard/kanban", label: "Kanban Funil de Vendas", icon: KanbanSquare, category: "Clientes" },
    { to: "/dashboard/interacoes", label: "Interações de Clientes", icon: MessageSquare, category: "Clientes" },
    { to: "/dashboard/clientes/qualidade", label: "Qualidade dos Dados", icon: ShieldCheck, category: "Clientes" },
    { to: "/dashboard/importar-clientes", label: "Importar Clientes", icon: Upload, category: "Clientes" },
    { to: "/dashboard/equipamentos", label: "Equipamentos Instalados", icon: Package, category: "Técnico" },
    { to: "/dashboard/garantias", label: "Garantias & Alertas", icon: Shield, category: "Técnico" },
    { to: "/dashboard/manutencoes", label: "Manutenções Preventivas", icon: CalendarClock, category: "Técnico" },
    { to: "/dashboard/tecnicos", label: "Técnicos & Equipe", icon: Wrench, category: "Técnico" },
    { to: "/dashboard/estoque", label: "Estoque & Peças", icon: Boxes, category: "Gestão" },
    { to: "/dashboard/gastos", label: "Gastos & Despesas", icon: DollarSign, category: "Gestão" },
    { to: "/dashboard/relatorios", label: "Relatórios Comerciais", icon: FileSpreadsheet, category: "Gestão" },
    { to: "/dashboard/integracoes", label: "Integrações (AUVO)", icon: Plug, category: "Gestão" },
    { to: "/dashboard/usuarios", label: "Usuários", icon: Users, category: "Administração" },
    { to: "/dashboard/permissoes", label: "Permissões (RBAC)", icon: Shield, category: "Administração" },
    { to: "/dashboard/configuracoes", label: "Configurações do CRM", icon: Settings, category: "Administração" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Digite para buscar clientes, navegação ou executar ações (⌘K)..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[65vh] overflow-y-auto p-2 scrollbar-thin">
        <CommandEmpty className="py-8 text-center text-sm text-[#706D65]">
          Nenhum resultado encontrado para "{search}".
        </CommandEmpty>

        {/* 1. Ações Rápidas */}
        {!q && (
          <CommandGroup heading="Criação & Ações Rápidas">
            <CommandItem
              onSelect={() => handleAction("novo_cliente")}
              className="flex items-center justify-between py-2.5 rounded-xl cursor-pointer hover:bg-[#FAF5E8]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5E8] text-[#E3B94F]">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="font-semibold text-[#24231F]">Cadastrar Novo Cliente</span>
              </div>
              <CommandShortcut>Novo Lead</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() => handleAction("nova_ordem")}
              className="flex items-center justify-between py-2.5 rounded-xl cursor-pointer hover:bg-[#FAF5E8]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1D1C19] text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="font-semibold text-[#24231F]">Criar Ordem de Serviço</span>
              </div>
              <CommandShortcut>OS Técnica</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() => handleAction("agendar_visita")}
              className="flex items-center justify-between py-2.5 rounded-xl cursor-pointer hover:bg-[#FAF5E8]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="font-semibold text-[#24231F]">Agendar Visita Técnica</span>
              </div>
              <CommandShortcut>Agenda Visitas</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() => handleAction("nova_tarefa")}
              className="flex items-center justify-between py-2.5 rounded-xl cursor-pointer hover:bg-[#FAF5E8]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <span className="font-semibold text-[#24231F]">Registrar Nova Tarefa</span>
              </div>
              <CommandShortcut>Pendência</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                onOpenChange(false);
                if (typeof window !== "undefined") {
                  window.open(AUVO_CHAT_URL, "_blank", "noopener,noreferrer");
                }
              }}
              className="flex items-center justify-between py-2.5 rounded-xl cursor-pointer hover:bg-[#FAF5E8]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5E8] text-[#C8794A]">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="font-semibold text-[#24231F]">Abrir Auvo Chat</span>
              </div>
              <CommandShortcut>Suporte Web</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        )}

        {/* 2. Itens Recentes */}
        {!q && recents.length > 0 && (
          <>
            <CommandSeparator className="my-2" />
            <CommandGroup
              heading={
                <div className="flex items-center justify-between w-full pr-2">
                  <span>Acessados Recentemente</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearRecents();
                    }}
                    className="text-[10px] font-normal text-[#8E8D88] hover:text-[#D32F2F] flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Limpar
                  </button>
                </div>
              }
            >
              {recents.map((item) => (
                <CommandItem
                  key={`${item.id}-${item.timestamp}`}
                  onSelect={() => handleSelectRecent(item)}
                  className="flex items-center justify-between py-2 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-[#8E8D88]" />
                    <div>
                      <span className="font-medium text-[#0B0B0C]">{item.title}</span>
                      {item.subtitle && (
                        <span className="ml-2 text-xs text-[#6E6D68]">{item.subtitle}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#8E8D88]" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* 3. Resultados da Busca de Clientes */}
        {clientResults.length > 0 && (
          <>
            <CommandSeparator className="my-2" />
            <CommandGroup heading={`Clientes Encontrados (${clientResults.length})`}>
              {clientResults.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => handleSelectClient(c)}
                  className="flex items-center justify-between py-2.5 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0EEE9] text-[#0B0B0C]">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-[#0B0B0C]">{c.nome}</span>
                      <span className="ml-2 text-xs text-[#6E6D68]">
                        {c.cidade ?? "Sem cidade"} · {c.whatsapp ?? "Sem telefone"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#D9A514]">Ficha 360°</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* 4. Módulos do Sistema */}
        <CommandSeparator className="my-2" />
        <CommandGroup heading="Módulos & Páginas do Sistema">
          {modules.map((m) => (
            <CommandItem
              key={m.to}
              onSelect={() => handleSelectModule(m.to, m.label)}
              className="flex items-center justify-between py-2 rounded-xl cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <m.icon className="h-4 w-4 text-[#8E8D88]" />
                <span className="font-medium text-[#0B0B0C]">{m.label}</span>
              </div>
              <CommandShortcut>{m.category}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
