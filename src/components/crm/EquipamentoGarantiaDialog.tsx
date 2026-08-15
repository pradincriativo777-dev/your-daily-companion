import { useState, useEffect } from "react";
import { EquipamentoGarantia } from "@/hooks/use-crm";
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

interface EquipamentoGarantiaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipamentoId: string;
  garantiaParaEditar?: EquipamentoGarantia | null;
  onSuccess: () => void;
}

export function EquipamentoGarantiaDialog({
  open,
  onOpenChange,
  equipamentoId,
  garantiaParaEditar,
  onSuccess,
}: EquipamentoGarantiaDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const [tipo, setTipo] = useState("Garantia do Fabricante");
  const [dataInicio, setDataInicio] = useState("");
  const [dataTermino, setDataTermino] = useState("");
  const [responsavel, setResponsavel] = useState("Fabricante / JANSOL");
  const [descricaoCobertura, setDescricaoCobertura] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (garantiaParaEditar) {
      setTipo(garantiaParaEditar.tipo || "Garantia do Fabricante");
      setDataInicio(garantiaParaEditar.data_inicio || "");
      setDataTermino(garantiaParaEditar.data_termino || "");
      setResponsavel(garantiaParaEditar.responsavel || "Fabricante / JANSOL");
      setDescricaoCobertura(garantiaParaEditar.descricao_cobertura || "");
      setObservacoes(garantiaParaEditar.observacoes || "");
    } else {
      setTipo("Garantia do Fabricante");
      setDataInicio(new Date().toISOString().split("T")[0] || "");
      setDataTermino("");
      setResponsavel("Fabricante / JANSOL");
      setDescricaoCobertura("");
      setObservacoes("");
    }
  }, [garantiaParaEditar, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (garantiaParaEditar) {
        const { error } = await (supabase.from as any)("equipamentos_garantias")
          .update({
            tipo,
            data_inicio: dataInicio || null,
            data_termino: dataTermino || null,
            responsavel: responsavel.trim() || null,
            descricao_cobertura: descricaoCobertura.trim() || null,
            observacoes: observacoes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", garantiaParaEditar.id);

        if (error) throw error;
        toast.success("Garantia atualizada com sucesso!");
      } else {
        const { error } = await (supabase.from as any)("equipamentos_garantias").insert({
          equipamento_id: equipamentoId,
          tipo,
          data_inicio: dataInicio || null,
          data_termino: dataTermino || null,
          responsavel: responsavel.trim() || null,
          descricao_cobertura: descricaoCobertura.trim() || null,
          observacoes: observacoes.trim() || null,
        });

        if (error) throw error;
        toast.success("Garantia cadastrada com sucesso!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar garantia.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {garantiaParaEditar ? "Editar Garantia" : "Nova Garantia do Equipamento"}
          </DialogTitle>
          <DialogDescription>
            Registre o tipo, prazo de vigência e cobertura da garantia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="tipo">Tipo de Garantia *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Garantia do Fabricante">Garantia do Fabricante</SelectItem>
                <SelectItem value="Garantia da Instalação">Garantia da Instalação (JANSOL)</SelectItem>
                <SelectItem value="Garantia de Peça Substituída">Garantia de Peça Substituída</SelectItem>
                <SelectItem value="Outra">Outra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dataInicio">Data de Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dataTermino">Data de Término (Opcional)</Label>
              <Input
                id="dataTermino"
                type="date"
                value={dataTermino}
                onChange={(e) => setDataTermino(e.target.value)}
              />
              <span className="text-[10px] text-slate-400 block">
                Se ausente, não expira automaticamente.
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="responsavel">Responsável pela Garantia</Label>
            <Input
              id="responsavel"
              placeholder="Ex: Heliotek do Brasil / SAC"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="descricaoCobertura">Descrição da Cobertura</Label>
            <Textarea
              id="descricaoCobertura"
              placeholder="Ex: Cobertura contra perfuração de reservatório e vício de fabricação..."
              rows={2}
              value={descricaoCobertura}
              onChange={(e) => setDescricaoCobertura(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="observacoes">Observações Adicionais</Label>
            <Textarea
              id="observacoes"
              placeholder="Termos específicos ou notas do contrato..."
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
              {submitting ? "Salvação..." : garantiaParaEditar ? "Atualizar" : "Salvar Garantia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
