import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Search, User, MapPin, Phone, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/use-crm";

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const { data: clientes = [] } = useClientes();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const q = term.trim().toLowerCase();
  const results = q
    ? clientes
        .filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.cidade ?? "").toLowerCase().includes(q) ||
            (c.whatsapp ?? "").toLowerCase().includes(q) ||
            (c.cpf_cnpj ?? "").toLowerCase().includes(q)
        )
        .slice(0, 10)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl border border-[#E7E5DF] bg-white p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="border-b border-[#E7E5DF] px-4 py-3">
          <DialogTitle className="sr-only">Busca Global JANSOL OS</DialogTitle>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-5 w-5 text-[#8E8D88]" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar cliente, telefone, cidade, CPF/CNPJ..."
              className="h-11 border-none bg-transparent pl-10 pr-4 text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#8E8D88]"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-[#E7E5DF] bg-[#F8F7F3] px-2 py-0.5 text-[10px] font-medium text-[#6E6D68]">
              ESC
            </kbd>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!q ? (
            <div className="py-8 text-center text-sm text-[#6E6D68]">
              Digite o nome do cliente, cidade ou telefone para buscar instantaneamente...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6E6D68]">
              Nenhum cliente encontrado para "<span className="font-semibold text-[#0B0B0C]">{term}</span>".
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8E8D88]">
                Clientes ({results.length})
              </div>
              {results.map((c) => (
                <Link
                  key={c.id}
                  to="/dashboard/clientes/$id"
                  params={{ id: c.id }}
                  onClick={() => {
                    setTerm("");
                    onOpenChange(false);
                  }}
                  className="group flex items-center justify-between rounded-xl p-3 hover:bg-[#FAF3D6]/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0EEE9] text-[#0B0B0C] group-hover:bg-[#D9A514] group-hover:text-white transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-[#0B0B0C]">
                        {c.nome}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#6E6D68]">
                        {c.cidade && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#8E8D88]" /> {c.cidade}
                          </span>
                        )}
                        {c.whatsapp && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-[#8E8D88]" /> {c.whatsapp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8E8D88] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
