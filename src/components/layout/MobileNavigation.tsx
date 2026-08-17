import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  FileText,
  CheckSquare,
  Bell,
  Search,
  Sun,
  X,
  MessageSquare,
  ExternalLink,
  LayoutGrid,
} from "lucide-react";
import { AUVO_CHAT_URL } from "@/lib/config";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MAIN_SHORTCUTS } from "./Sidebar";
import { cn } from "@/lib/utils";
import { TodosModulosSheet } from "./TodosModulosSheet";

export function MobileDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [todosModulosOpen, setTodosModulosOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-72 bg-[#0B0B0C] p-0 text-white border-r border-[#242426] flex flex-col justify-between"
        >
          <div className="flex flex-col h-full pt-safe">
            {/* Header Mobile Drawer */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#242426]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D9A514] text-[#0B0B0C]">
                  <Sun className="h-4 w-4 font-bold" />
                </div>
                <SheetTitle className="text-lg font-black tracking-tight text-white">
                  JANSOL <span className="text-[#D9A514] text-xs font-semibold">OS</span>
                </SheetTitle>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 pb-20">
              <div className="space-y-1.5">
                <div className="space-y-1">
                  {MAIN_SHORTCUTS.map((item: any) => {
                    const active = item.exact
                      ? pathname === item.to || pathname === `${item.to}/`
                      : pathname.startsWith(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors min-h-[44px]",
                          active
                            ? "bg-[#FAF3D6] text-[#0B0B0C] font-semibold"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-[#D9A514]" : "text-white/60"
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  <div className="pt-2 pb-2">
                    <div className="h-px bg-white/10 w-full" />
                  </div>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setTodosModulosOpen(true);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors min-h-[44px] text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <LayoutGrid className="h-5 w-5 shrink-0 text-white/60" />
                    <span className="flex-1 text-left">Todos os módulos</span>
                  </button>
                </div>
              </div>

              {/* Atalho Auvo Chat para Mobile */}
              <div className="pt-2 border-t border-white/10 space-y-1">
                <a
                  href={AUVO_CHAT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white min-h-[44px]"
                >
                  <div className="flex items-center gap-3.5">
                    <MessageSquare className="h-5 w-5 text-[#E3B94F]" />
                    <span>Auvo Chat</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/50" />
                </a>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <TodosModulosSheet
        open={todosModulosOpen}
        onOpenChange={setTodosModulosOpen}
        currentPath={pathname}
      />
    </>
  );
}

export function MobileBottomBar({
  onOpenSearch,
}: {
  onOpenSearch: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { to: "/dashboard/agenda", label: "Agenda", icon: Calendar },
    { to: "/dashboard/ordens", label: "Ordens", icon: FileText },
    { to: "/dashboard/tarefas", label: "Tarefas", icon: CheckSquare },
    { to: "/dashboard/notificacoes", label: "Avisos", icon: Bell },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[#E7E5DF] bg-white/95 backdrop-blur-md px-2 pb-safe md:hidden shadow-lg">
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Abrir busca global"
        className="flex flex-col items-center justify-center gap-0.5 text-xs text-[#6E6D68] min-h-[44px] min-w-[44px] px-2"
      >
        <Search className="h-5 w-5 text-[#D9A514]" />
        <span className="text-[10px] font-medium">Buscar</span>
      </button>

      {navItems.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-xs min-h-[44px] min-w-[44px] px-2 transition-colors",
              active ? "text-[#0B0B0C] font-semibold" : "text-[#6E6D68]"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5",
                active ? "text-[#D9A514]" : "text-[#8E8D88]"
              )}
            />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
