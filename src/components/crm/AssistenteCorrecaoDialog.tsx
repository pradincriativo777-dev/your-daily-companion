import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { analyzeClientDatabase } from "@/lib/data-quality";
import { serverExecuteCorrection } from "@/lib/correction.server";
import type { Cliente } from "@/hooks/use-crm";

interface AssistenteCorrecaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente;
}

export function AssistenteCorrecaoDialog({ open, onOpenChange, cliente }: AssistenteCorrecaoDialogProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Encontra apenas os problemas deste cliente usando a engine existente
  const issues = useMemo(() => {
    if (!cliente) return [];
    const analysis = analyzeClientDatabase([cliente]);
    return analysis.clientIssues;
  }, [cliente]);

  // Estado dos campos editados
  const [edits, setEdits] = useState<Record<string, string>>({});

  const handleEdit = (field: string, value: string) => {
    setEdits(prev => ({ ...prev, [field]: value }));
    setValidated(false); // Reseta a validação se editar
    setErrorMsg("");
  };

  // Os campos modificados para valer (onde o valor é diferente do original)
  const modifiedFields = useMemo(() => {
    const result: Record<string, string> = {};
    for (const issue of issues) {
      const field = issue.affectedField;
      if (field === "multiplos") continue; // Ignora alertas sintéticos
      
      const originalValue = (cliente! as any)[field] ?? "";
      const newValue = edits[field];
      
      if (newValue !== undefined && newValue !== String(originalValue)) {
        result[field] = newValue;
      }
    }
    return result;
  }, [edits, cliente, issues]);

  const hasModifications = Object.keys(modifiedFields).length > 0;

  const handleValidate = () => {
    setErrorMsg("");
    if (!hasModifications) {
      setErrorMsg("Nenhum campo foi modificado.");
      return;
    }

    // Cria um cliente "rascunho" com as alterações para re-testar na engine
    const draftCliente = { ...cliente, ...modifiedFields } as Cliente;
    
    // Roda a engine de qualidade no rascunho
    const draftAnalysis = analyzeClientDatabase([draftCliente]);
    
    // Verifica se os campos que o usuário alterou continuam gerando erros no rascunho
    const remainingErrors = draftAnalysis.clientIssues.filter(i => Object.keys(modifiedFields).includes(i.affectedField));
    
    if (remainingErrors.length > 0) {
// @ts-expect-error possible undefined

      setErrorMsg(`Erro de validação: O campo '${remainingErrors[0].affectedField}' ainda está inválido (${remainingErrors[0].description}).`);
      return;
    }
    
    setValidated(true);
  };

  const handleConfirm = async () => {
    if (!validated) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const modificados = Object.keys(modifiedFields);
      const valoresAnteriores: Record<string, any> = {};
      const cAny = cliente! as any;
      if (cAny) {
        modificados.forEach(k => {
          valoresAnteriores[k] = cAny[k];
        });
      }

      // Motivo agregando os titulos dos issues corrigidos
      const motivoCorrecao = issues
        .filter(i => Object.keys(modifiedFields).includes(i.affectedField))
        .map(i => i.title)
        .join(", ");

      const res = await serverExecuteCorrection({
        data: {
          clienteId: cliente.id,
          valoresAnteriores,
          valoresNovos: modifiedFields,
          motivoCorrecao: motivoCorrecao || "Correção manual",
        }
      });

      if (!(res as any).success) throw new Error((res as any).error);

      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      onOpenChange(false);
      setEdits({});
      setValidated(false);
    } catch (e: any) {
      setErrorMsg(e.message);
      setValidated(false); // Obriga a re-validar
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        onOpenChange(val);
        if (!val) {
          setEdits({});
          setValidated(false);
          setErrorMsg("");
        }
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assistente de Correção Individual</DialogTitle>
          <DialogDescription>
            Corrija apenas os campos inconsistentes. O sistema fará o backup dos valores originais.
          </DialogDescription>
        </DialogHeader>

        {issues.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground flex flex-col items-center">
            <CheckCircle2 className="h-10 w-10 text-success mb-2" />
            <p>Este cadastro não possui pendências de qualidade detectadas.</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {issues.filter(i => i.affectedField !== "multiplos").map((issue, idx) => {
              const originalValue = String((cliente! as any)[issue.affectedField] ?? "");
              const currentValue = edits[issue.affectedField] ?? originalValue;

              return (
                <div key={idx} className="p-4 rounded-lg border bg-muted/20 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm">{issue.title}</div>
                      <div className="text-xs text-muted-foreground">{issue.description}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor Atual (Banco)</Label>
                      <div className="text-sm font-mono p-2 bg-background border rounded mt-1 truncate" title={originalValue}>
                        {originalValue || "—"}
                      </div>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground mt-5" />
                    
                    <div>
                      <Label className="text-xs">Novo Valor</Label>
                      <Input 
                        className="mt-1 font-mono text-sm"
                        value={currentValue}
                        onChange={(e) => handleEdit(issue.affectedField, e.target.value)}
                        placeholder="Digite o valor correto"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {errorMsg && (
              <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              
              {!validated ? (
                <Button onClick={handleValidate} disabled={!hasModifications}>
                  Validar Alterações
                </Button>
              ) : (
                <Button 
                  onClick={handleConfirm} 
                  disabled={loading}
                  className="bg-success text-success-foreground hover:bg-success/90 gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {loading ? "Salvando..." : "Confirmar Correção Definitiva"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
