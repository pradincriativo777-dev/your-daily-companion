import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  CheckCircle2,
  Trash2,
  Download,
  Flame,
  Layers,
  Check,
  Building2,
  RefreshCw,
  Loader2,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CLIENTES_TESTE_FUNIL } from "@/lib/funil-test-data";
import { STATUS_CLIENTE, formatCurrency } from "@/lib/crm";

interface DemoFunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}

export function DemoFunnelModal({
  open,
  onOpenChange,
  onDataChanged,
}: DemoFunnelModalProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const statsByStatus = STATUS_CLIENTE.map((status) => {
    const list = CLIENTES_TESTE_FUNIL.filter((c) => c.status === status);
    const totalVal = list.reduce((acc, c) => acc + (c.valor_orcamento || 0), 0);
    return {
      status,
      count: list.length,
      totalValor: totalVal,
    };
  });

  const totalGeral = CLIENTES_TESTE_FUNIL.reduce(
    (acc, c) => acc + (c.valor_orcamento || 0),
    0,
  );

  const handleGerarClientes = async () => {
    setLoading(true);
    try {
      // 1. Verificar técnicos para relacionar
      const { data: tecnicos } = await supabase.from("tecnicos").select("id, nome");
      let tecIds = (tecnicos || []).map((t: any) => t.id);

      if (tecIds.length === 0) {
        // Criar técnicos padrão se não existirem
        const { data: novosTecs } = await supabase
          .from("tecnicos")
          .insert([
            { nome: "Carlos Silva", especialidade: "Instalação", status: "Ativo" },
            { nome: "Marcos Oliveira", especialidade: "Manutenção", status: "Ativo" },
            { nome: "Rafael Souza", especialidade: "Ambos", status: "Ativo" },
          ])
          .select("id");
        if (novosTecs) {
          tecIds = novosTecs.map((t: any) => t.id);
        }
      }

      // 2. Montar dados
      const payload = CLIENTES_TESTE_FUNIL.map((c, idx) => ({
        ...c,
        tecnico_id: tecIds.length > 0 ? tecIds[idx % tecIds.length] : null,
      }));

      // 3. Inserir clientes de teste
      const { data, error } = await supabase.from("clientes").insert(payload as any).select("id");

      if (error) {
        throw new Error(error.message);
      }

      toast.success(
        `🎉 ${data?.length || payload.length} clientes de teste gerados com sucesso no funil!`,
      );

      await qc.invalidateQueries({ queryKey: ["clientes"] });
      onDataChanged?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao gerar clientes demo:", err);
      toast.error(`Falha ao gerar clientes: ${err.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLimparClientesTeste = async () => {
    setCleaning(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("origem_importacao", "SEED_TESTE_FUNIL");

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Clientes de teste removidos da base com sucesso!");
      await qc.invalidateQueries({ queryKey: ["clientes"] });
      onDataChanged?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao limpar dados de teste:", err);
      toast.error(`Falha ao remover clientes de teste: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(CLIENTES_TESTE_FUNIL, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes_teste_funil_jansol.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download do arquivo de teste concluído!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1D1C19] border-[#38352F] text-[#F8F6F1]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E3B94F]/20 text-[#E3B94F] border border-[#E3B94F]/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#F8F6F1]">
                Testar Funil de Vendas com Clientes de Demonstração
              </DialogTitle>
              <DialogDescription className="text-xs text-[#99958C]">
                Popule o Kanban com clientes realistas distribuídos em todas as etapas comerciais da JANSOL.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Box de Informações e Distribuição do Funil */}
          <div className="rounded-xl border border-[#38352F] bg-[#292722] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#DDD8CE]">
                Distribuição no Pipeline ({CLIENTES_TESTE_FUNIL.length} Clientes)
              </span>
              <span className="text-xs font-semibold text-[#E3B94F]">
                Total em Pipeline: {formatCurrency(totalGeral)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {statsByStatus.map((item) => (
                <div
                  key={item.status}
                  className="rounded-lg border border-[#38352F] bg-[#1A1916] p-2.5 text-center flex flex-col justify-between"
                >
                  <p className="text-[11px] font-semibold text-[#DDD8CE] truncate">
                    {item.status}
                  </p>
                  <p className="text-lg font-bold text-[#E3B94F] my-1">
                    {item.count}
                  </p>
                  <p className="text-[10px] text-[#99958C]">
                    {formatCurrency(item.totalValor)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Destaques do Dataset de Teste */}
          <div className="rounded-xl border border-[#38352F] bg-[#1A1916] p-3 text-xs space-y-2 text-[#DDD8CE]">
            <p className="font-semibold text-[#F8F6F1] flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" /> O que está incluído no pacote de teste:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#99958C] pl-1">
              <li>Clientes com sistemas de <strong>Banho</strong>, <strong>Piscina</strong> e <strong>Ambos</strong></li>
              <li>Cidades da região: Resende, Itatiaia, Porto Real, Barra Mansa e Volta Redonda</li>
              <li>Valores orçados realistas (R$ 7.600 a R$ 38.900), com marcas Solis, Termomax, Solarem e Tholz</li>
              <li>Identificação automática (<code className="text-[#E3B94F]">SEED_TESTE_FUNIL</code>) que permite exclusão segura posterior</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center sm:items-stretch pt-2 border-t border-[#38352F]">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadJSON}
              className="text-xs border-[#38352F] bg-[#292722] hover:bg-[#38352F] text-[#DDD8CE]"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar JSON
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={cleaning || loading}
              onClick={handleLimparClientesTeste}
              className="text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50"
            >
              {cleaning ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Limpar Clientes de Teste
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-[#99958C] hover:text-[#F8F6F1]"
            >
              Fechar
            </Button>
            <Button
              type="button"
              disabled={loading || cleaning}
              onClick={handleGerarClientes}
              className="jansol-gradient-btn text-xs font-bold text-[#1D1C19] shadow-md px-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Inserindo no Banco...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Gerar Clientes no Funil
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
