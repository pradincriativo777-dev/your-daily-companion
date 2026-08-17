import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Command, Sparkles } from "lucide-react";

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shortcuts = [
    { key: "⌘ K / Ctrl + K", desc: "Abrir Central de Comandos Universal" },
    { key: "/", desc: "Focar campo de busca (fora de campos de texto)" },
    { key: "Esc", desc: "Fechar menus, modais, busca e painéis" },
    { key: "Ctrl + \\", desc: "Recolher ou expandir menu lateral" },
    { key: "G → D", desc: "Ir para o Dashboard Executivo" },
    { key: "G → C", desc: "Ir para a página de Clientes" },
    { key: "G → A", desc: "Ir para a Agenda de Visitas" },
    { key: "G → O", desc: "Ir para Ordens de Serviço" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-[#E7E5DF] bg-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-[#E7E5DF] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3D6] text-[#D9A514]">
              <Keyboard className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#0B0B0C]">
              Atalhos de Teclado · JANSOL OS
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="my-4 space-y-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-xl bg-[#F8F7F3] p-2.5 text-xs border border-[#E7E5DF]/60"
            >
              <span className="font-medium text-[#0B0B0C]">{s.desc}</span>
              <kbd className="inline-flex items-center rounded-md border border-[#E7E5DF] bg-white px-2 py-1 font-mono font-semibold text-[#0B0B0C] shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-[#FAF3D6]/50 p-3 text-xs text-[#6E6D68] border border-[#D9A514]/20 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D9A514] shrink-0" />
          <span>Atalhos de letra única são desativados automaticamente enquanto você digita em campos de texto.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
