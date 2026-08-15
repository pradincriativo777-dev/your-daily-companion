import { useState } from "react";
import { Equipamento } from "@/hooks/use-crm";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EquipamentoSubstituirDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamentoAntigo: Equipamento | null;
  userRole?: string;
  onSuccess: () => void;
}

export function EquipamentoSubstituirDialog({
  open,
  onOpenChange,
  equipamentoAntigo,
  userRole = "admin",
  onSuccess,
}: EquipamentoSubstituirDialogProps) {
  if (!equipamentoAntigo) return null;

  const [submitting, setSubmitting] = useState(false);

  const [novaMarca, setNovaMarca] = useState("");
  const [novoModelo, setNovoModelo] = useState("");
  const [novoNumeroSerie, setNovoNumeroSerie] = useState("");
  const [motivoSubstituicao, setMotivoSubstituicao] = useState("");

  const handleSubstituir = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userRole !== "admin") {
      toast.error("Somente administradores podem substituir equipamentos.");
      return;
    }

    if (!novaMarca.trim() || !novoModelo.trim()) {
      toast.error("Informe a Marca e Modelo do novo equipamento.");
      return;
    }

    if (!motivoSubstituicao.trim()) {
      toast.error("Por favor, descreva o motivo da substituição.");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Marcar equipamento antigo como "Substituído"
      const { error: errAntigo } = await (supabase.from as any)("equipamentos")
        .update({
          estado: "Substituído",
          observacoes_tecnicas: `SUBSTITUÍDO: ${motivoSubstituicao}. ${equipamentoAntigo.observacoes_tecnicas || ""}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", equipamentoAntigo.id);

      if (errAntigo) throw errAntigo;

      // 2. Criar novo equipamento vinculado ao antigo
      const { data: novoEq, error: errNovo } = await (supabase.from as any)("equipamentos")
        .insert({
          cliente_id: equipamentoAntigo.cliente_id,
          categoria: equipamentoAntigo.categoria,
          marca: novaMarca.trim(),
          modelo: novoModelo.trim(),
          numero_serie: novoNumeroSerie.trim() || null,
          quantidade: equipamentoAntigo.quantidade,
          data_instalacao: new Date().toISOString().split("T")[0],
          empresa_responsavel_instalacao: equipamentoAntigo.empresa_responsavel_instalacao,
          local_instalacao: equipamentoAntigo.local_instalacao,
          estado: "Ativo",
          equipamento_substituido_id: equipamentoAntigo.id,
          observacoes_tecnicas: `Equipamento instalado em substituição ao equipamento anterior (${equipamentoAntigo.marca} ${equipamentoAntigo.modelo}). Motivo: ${motivoSubstituicao}`,
        })
        .select()
        .single();

      if (errNovo) throw errNovo;

      // 3. Registrar auditoria
      await (supabase.from as any)("equipamentos_auditoria").insert({
        equipamento_id: equipamentoAntigo.id,
        acao: "SUBSTITUICAO",
        detalhes: {
          equipamento_novo_id: novoEq.id,
          marca_antiga: equipamentoAntigo.marca,
          modelo_antigo: equipamentoAntigo.modelo,
          marca_nova: novaMarca,
          modelo_novo: novoModelo,
          motivo: motivoSubstituicao,
        },
      });

      toast.success("Equipamento substituído com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao substituir equipamento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Substituir Equipamento</DialogTitle>
          <DialogDescription>
            O equipamento antigo (<strong>{equipamentoAntigo.marca} {equipamentoAntigo.modelo}</strong>) será mantido no histórico com o estado "Substituído" e o novo equipamento será cadastrado e vinculado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubstituir} className="space-y-3 py-2">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md text-xs text-amber-900 dark:text-amber-200">
            <strong>Equipamento Antigo:</strong> {equipamentoAntigo.categoria} • {equipamentoAntigo.marca} {equipamentoAntigo.modelo} {equipamentoAntigo.numero_serie ? `(Nº ${equipamentoAntigo.numero_serie})` : ""}
          </div>

          <div className="space-y-1">
            <Label htmlFor="motivoSubstituicao">Motivo da Substituição *</Label>
            <Textarea
              id="motivoSubstituicao"
              placeholder="Ex: Reservatório com vazamento irreparável / Fim da vida útil..."
              rows={2}
              value={motivoSubstituicao}
              onChange={(e) => setMotivoSubstituicao(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="novaMarca">Marca do Novo Equipamento *</Label>
              <Input
                id="novaMarca"
                placeholder="Ex: Heliotek"
                value={novaMarca}
                onChange={(e) => setNovaMarca(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="novoModelo">Modelo do Novo Equipamento *</Label>
              <Input
                id="novoModelo"
                placeholder="Ex: MK 600L Inox"
                value={novoModelo}
                onChange={(e) => setNovoModelo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="novoNumeroSerie">Novo Número de Série (Opcional)</Label>
            <Input
              id="novoNumeroSerie"
              placeholder="Ex: NS-2026-9910"
              value={novoNumeroSerie}
              onChange={(e) => setNovoNumeroSerie(e.target.value)}
            />
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Processando..." : "Confirmar Substituição"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
