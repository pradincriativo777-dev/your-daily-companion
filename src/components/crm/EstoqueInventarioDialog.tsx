import { useState, useEffect } from "react";
import { EstoqueItem, EstoqueMovimentacao } from "@/hooks/use-crm";
import { calcularSaldosEstoque, gerarCodigoOperacao } from "@/lib/estoque";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EstoqueInventarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itens: EstoqueItem[];
  movimentacoes: EstoqueMovimentacao[];
  userRole?: string;
  onSuccess: () => void;
}

export function EstoqueInventarioDialog({
  open,
  onOpenChange,
  itens,
  movimentacoes,
  userRole = "admin",
  onSuccess,
}: EstoqueInventarioDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [contagens, setContagens] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      // Inicializar contagens com o saldo físico esperado
      const initial: Record<string, number> = {};
      itens.forEach((item) => {
        const movs = movimentacoes.filter((m) => m.item_id === item.id);
        const saldos = calcularSaldosEstoque(movs);
        initial[item.id] = saldos.saldoFisico;
      });
      setContagens(initial);
    }
  }, [open, itens, movimentacoes]);

  const handleContagemChange = (itemId: string, valor: number) => {
    setContagens((prev) => ({ ...prev, [itemId]: valor }));
  };

  const handleFinalizarInventario = async () => {
    if (userRole !== "admin") {
      toast.error("Somente administradores podem aprovar ajustes de inventário.");
      return;
    }

    try {
      setSubmitting(true);
      const codigoInv = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Criar Registro de Inventário
      const { data: inv, error: errInv } = await (supabase.from as any)(
        "estoque_inventarios",
      ).insert({
        codigo: codigoInv,
        status: "Concluído",
        observacoes: "Inventário físico concluído e concilidade com sucesso.",
      }).select().single();

      if (errInv) throw errInv;

      let totalAjustes = 0;

      // 2. Iterar itens e gerar movimentação compensatória se houver divergência
      for (const item of itens) {
        const movs = movimentacoes.filter((m) => m.item_id === item.id);
        const esperada = calcularSaldosEstoque(movs).saldoFisico;
        const contada = contagens[item.id] ?? esperada;
        const diff = Number((contada - esperada).toFixed(3));

        // Registrar item do inventário
        await (supabase.from as any)("estoque_inventario_itens").insert({
          inventario_id: inv.id,
          item_id: item.id,
          quantidade_esperada: esperada,
          quantidade_contada: contada,
        });

        // Se houver divergência, gerar ajuste compensatório no livro razão
        if (diff !== 0) {
          totalAjustes++;
          const codOp = gerarCodigoOperacao();

          const { data: movAjuste } = await (supabase.from as any)(
            "estoque_movimentacoes",
          ).insert({
            item_id: item.id,
            codigo_operacao: codOp,
            tipo: "ajuste_inventario",
            quantidade: diff,
            custo_unitario: item.custo_medio || 0,
            motivo: `Ajuste automático do Inventário ${codigoInv}. Diferença contada vs esperada: ${diff > 0 ? "+" : ""}${diff} ${item.unidade_medida}`,
          }).select().single();

          // Auditoria
          await (supabase.from as any)("estoque_auditoria").insert({
            item_id: item.id,
            inventario_id: inv.id,
            movimentacao_id: movAjuste?.id,
            acao: "AJUSTE_INVENTARIO",
            saldo_anterior: esperada,
            saldo_novo: contada,
            detalhes: {
              divergencia: diff,
              codigo_inventario: codigoInv,
            },
          });
        }
      }

      toast.success(
        `Inventário ${codigoInv} concluído com sucesso! ${totalAjustes} ajustes compensatórios gerados.`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar inventário.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contagem de Inventário Físico</DialogTitle>
          <DialogDescription>
            Digite a quantidade física real apurada no galpão/prateleira. O estoque corrente não é alterado até a confirmação administrativa.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <Table>
            <TableHeader>
              <TableRow className="text-xs bg-slate-50 dark:bg-slate-900">
                <TableHead className="font-bold">SKU / Item</TableHead>
                <TableHead className="font-bold">Localização</TableHead>
                <TableHead className="font-bold text-center">Saldo Esperado</TableHead>
                <TableHead className="font-bold text-center w-36">Quantidade Contada</TableHead>
                <TableHead className="font-bold text-center">Divergência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => {
                const movs = movimentacoes.filter((m) => m.item_id === item.id);
                const esperada = calcularSaldosEstoque(movs).saldoFisico;
                const contada = contagens[item.id] ?? esperada;
                const diff = Number((contada - esperada).toFixed(3));

                return (
                  <TableRow key={item.id} className="text-xs">
                    <TableCell className="font-semibold">
                      <span className="font-mono text-slate-500 mr-2">[{item.sku}]</span>
                      {item.nome} ({item.marca})
                    </TableCell>
                    <TableCell>{item.localizacao_fisica || "—"}</TableCell>
                    <TableCell className="text-center font-bold">
                      {esperada} {item.unidade_medida}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        step="0.001"
                        className="h-8 text-xs font-bold text-center"
                        value={contada}
                        onChange={(e) => handleContagemChange(item.id, Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {diff === 0 ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600">
                          Sem divergência
                        </Badge>
                      ) : diff > 0 ? (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 font-bold">
                          +{diff} {item.unidade_medida}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          {diff} {item.unidade_medida}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleFinalizarInventario} disabled={submitting}>
            {submitting ? "Processando..." : "Confirmar e Ajustar Inventário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
