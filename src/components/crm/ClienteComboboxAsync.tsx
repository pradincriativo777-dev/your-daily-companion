import { useState, useEffect, useRef } from "react";
import { Cliente } from "@/hooks/use-crm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Check, ChevronsUpDown, UserX, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ClienteComboboxAsyncProps {
  value?: string;
  onValueChange: (clienteId: string, cliente?: Cliente) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ClienteComboboxAsync({
  value,
  onValueChange,
  placeholder = "Digite no mínimo 2 letras para buscar cliente...",
  disabled = false,
  className,
}: ClienteComboboxAsyncProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar cliente pré-selecionado por ID se já fornecido
  useEffect(() => {
    if (value) {
      if (clienteSelecionado?.id === value) return;

      supabase
        .from("clientes")
        .select("*")
        .eq("id", value)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setClienteSelecionado(data as Cliente);
          }
        });
    } else {
      setClienteSelecionado(null);
    }
  }, [value]);

  // Efeito Debounced de Busca Assíncrona
  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setResultados([]);
      setLoading(false);
      setErro(null);
      return;
    }

    setLoading(true);
    setErro(null);

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("id, nome, cidade, endereco, status")
          .or(`nome.ilike.%${term}%,cidade.ilike.%${term}%,cpf_cnpj.ilike.%${term}%`)
          .limit(20);

        if (error) throw error;

        // Deduplicar resultados por ID
        const map = new Map<string, Cliente>();
        (data || []).forEach((c: any) => {
          if (!map.has(c.id)) {
            map.set(c.id, c as Cliente);
          }
        });

        setResultados(Array.from(map.values()));
      } catch (err: any) {
        console.error("Erro na busca assíncrona de clientes:", err);
        setErro("Erro ao carregar clientes.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (c: Cliente) => {
    setClienteSelecionado(c);
    onValueChange(c.id, c);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < resultados.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : resultados.length - 1));
    } else if (e.key === "Enter" && focusedIndex >= 0 && resultados[focusedIndex]) {
      e.preventDefault();
      handleSelect(resultados[focusedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900",
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        <span className="truncate">
          {clienteSelecionado ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {clienteSelecionado.nome} {clienteSelecionado.cidade ? `(${clienteSelecionado.cidade})` : ""}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </div>

      {/* DROPDOWN ASSÍNCRONO */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md text-xs">
          <div className="flex items-center border-b px-2 pb-1.5 pt-1">
            <Search className="h-3.5 w-3.5 mr-2 text-slate-400 shrink-0" />
            <Input
              ref={inputRef}
              placeholder="Pesquisar por nome ou cidade (mín. 2 letras)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              className="h-7 text-xs border-0 focus-visible:ring-0 px-0"
            />
          </div>

          <div className="py-1">
            {query.trim().length < 2 ? (
              <div className="p-3 text-center text-slate-400 text-[11px]">
                Digite pelo menos 2 caracteres para pesquisar.
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center p-4 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando clientes...
              </div>
            ) : erro ? (
              <div className="flex items-center justify-center p-3 text-rose-500">
                <AlertCircle className="h-4 w-4 mr-1.5" />
                {erro}
              </div>
            ) : resultados.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-[11px] flex items-center justify-center">
                <UserX className="h-4 w-4 mr-1.5" />
                Nenhum cliente encontrado.
              </div>
            ) : (
              resultados.map((c, idx) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors",
                    focusedIndex === idx || c.id === value
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="truncate">
                    <span className="font-bold block">{c.nome}</span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {c.cidade || "Cidade não informada"} • Status: {c.status}
                    </span>
                  </div>

                  {c.id === value && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-2" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
