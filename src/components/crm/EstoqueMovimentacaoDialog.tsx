import { useState } from "react";
import { EstoqueItem, EstoqueMovimentacao } from "@/hooks/use-crm";
import {
  TipoMovimentacaoEstoque,
  calcularCustoMedioPonderado,
  calcularSaldosEstoque,
  gerarCodigoOperacao,
} from "@/lib/estoque";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EstoqueMovimentacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itens: EstoqueItem[];
  movimentacoesExistentes: EstoqueMovimentacao[];
  itemPreSelecionadoId?: string | undefined;
  userRole?: string;
  onSuccess: () => void;
}

export function EstoqueMovimentacaoDialog({
  open,
  onOpenChange,
  itens,
  movimentacoesExistentes,
  itemPreSelecionadoId,
  userRole = "admin",
  onSuccess,
}: EstoqueMovimentacaoDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const [itemId, setItemId] = useState(itemPreSelecionadoId || "");
  const [tipo, setTipo] = useState<TipoMovimentacaoEstoque>("entrada");
  const [quantidade, setQuantidade] = useState(1);
  const [custoUnitario, setCustoUnitario] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [comprovanteUrl, setComprovanteUrl] = useState("");
  const [liberarSaldoNegativoAdmin, setLiberarSaldoNegativoAdmin] = useState(false);

  const itemSelecionado = itens.find((i) => i.id === itemId);
  const movsDoItem = movimentacoesExistentes.filter((m) => m.item_id === itemId);
  const saldos = calcularSaldosEstoque(movsDoItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!itemId) {
      toast.error("Selecione o item de estoque.");
      return;
    }

    if (quantidade <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    if (!itemSelecionado) {
      toast.error("Item não encontrado.");
      return;
    }

    // Trava de Saldo Negativo para saídas (perda, devolução ao fornecedor)
    if (
      (tipo === "perda_avaria" || tipo === "devolucao_fornecedor") &&
      saldos.saldoDisponivel - quantidade < 0
    ) {
      if (!liberarSaldoNegativoAdmin || userRole !== "admin") {
        toast.error(
          `Saldo insuficiente! Saldo disponível: ${saldos.saldoDisponivel}. Requer autorização administrativa.`,
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const codOperacao = gerarCodigoOperacao();

      // 1. Inserir a movimentação imutável no livro razão
      const { data: movCriada, error: errMov } = await (supabase.from as any)(
        "estoque_movimentacoes",
      ).insert({
        item_id: itemId,
        codigo_operacao: codOperacao,
        tipo,
        quantidade: Number(quantidade),
        custo_unitario: Number(custoUnitario) || 0,
        motivo: motivo.trim() || null,
        documento_comprovante_url: comprovanteUrl.trim() || null,
      }).select().single();

      if (errMov) throw errMov;

      // 2. Se for ENTRADA, recalcular o Custo Médio Ponderado
      if (tipo === "entrada") {
        const novoCustoMedio = calcularCustoMedioPonderado({
          saldoAtual: saldos.saldoFisico,
          custoMedioAtual: itemSelecionado.custo_medio || 0,
          qtdEntrada: Number(quantidade),
          custoEntrada: Number(custoUnitario) || 0,
        });

        const { error: errItem } = await (supabase.from as any)("estoque_itens")
          .update({
            custo_medio: novoCustoMedio,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemId);

        if (errItem) throw errItem;
      }

      // 3. Registrar auditoria se for saldo negativo liberado pelo admin
      if (liberarSaldoNegativoAdmin && userRole === "admin") {
        await (supabase.from as any)("estoque_auditoria").insert({
          item_id: itemId,
          movimentacao_id: movCriada.id,
          acao: "LIBERACAO_SALDO_NEGATIVO",
          saldo_anterior: saldos.saldoDisponivel,
          saldo_novo: saldos.saldoDisponivel - quantidade,
          detalhes: {
            motivo,
            usuario: "Admin",
          },
        });
      }

      toast.success(`Movimentação (${tipo.toUpperCase()}) registrada com sucesso! Code: ${codOperacao}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar movimentação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação de Estoque</DialogTitle>
          <DialogDescription>
            Toda operação gera um registro imutável no livro razão de movimentações.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="item">Item de Estoque *</Label>
            <Select value={itemId} onValueChange={setItemId} disabled={!!itemPreSelecionadoId}>
              <SelectTrigger id="item">
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {itens.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    [{i.sku}] {i.nome} ({i.marca})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {itemSelecionado && (
              <div className="p-2 bg-slate-50 dark:bg-slate-900 border rounded text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex justify-between">
                <span>Saldo Físico: <strong>{saldos.saldoFisico} {itemSelecionado.unidade_medida}</strong></span>
                <span>Disponível: <strong>{saldos.saldoDisponivel} {itemSelecionado.unidade_medida}</strong></span>
                <span>Custo Médio: <strong>R$ {itemSelecionado.custo_medio.toFixed(2)}</strong></span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="tipo">Tipo de Movimentação *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimentacaoEstoque)}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada de Mercadoria</SelectItem>
                <SelectItem value="perda_avaria">Perda ou Avaria</SelectItem>
                <SelectItem value="devolucao_fornecedor">Devolução ao Fornecedor</SelectItem>
                <SelectItem value="ajuste_inventario">Ajuste de Inventário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="quantidade">
                Quantidade {itemSelecionado ? `(${itemSelecionado.unidade_medida})` : ""} *
              </Label>
              <Input
                id="quantidade"
                type="number"
                step="0.001"
                min="0.001"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custoUnitario">Custo Unitário (R$)</Label>
              <Input
                id="custoUnitario"
                type="number"
                step="0.01"
                min="0"
                value={custoUnitario}
                onChange={(e) => setCustoUnitario(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="motivo">Motivo / Observações</Label>
            <Textarea
              id="motivo"
              placeholder="Ex: Recebimento de NF 883921 / Danificado no transporte..."
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          {userRole === "admin" && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="saldoNegativo"
                checked={liberarSaldoNegativoAdmin}
                onChange={(e) => setLiberarSaldoNegativoAdmin(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="saldoNegativo" className="text-xs text-amber-600 font-medium cursor-pointer">
                Permissão admin explícita para autorizar saldo negativo
              </Label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Gravando..." : "Confirmar Movimentação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
