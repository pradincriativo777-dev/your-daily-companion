import { useState, useMemo, useRef, KeyboardEvent } from "react";
import type { Cliente } from "@/hooks/use-crm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  X, 
  AlertCircle,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { serverExecuteCorrection } from "@/lib/correction.server";
import { useQueryClient } from "@tanstack/react-query";
import { analyzeClientDatabase } from "@/lib/data-quality";

interface SpreadsheetViewProps {
  clientes: Cliente[];
}

export function SpreadsheetView({ clientes }: SpreadsheetViewProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Local state for pending edits: { [clienteId]: { [field]: newValue } }
  const [pendingEdits, setPendingEdits] = useState<Record<string, Record<string, string>>>({});
  
  const [showReview, setShowReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const totalPages = Math.ceil(clientes.length / pageSize);
  const currentClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return clientes.slice(start, start + pageSize);
  }, [clientes, page]);

  // Handle cell edits
  const handleEdit = (clienteId: string, field: string, value: string) => {
    const newValue = value?.trim() ?? "";
    const c = clientes.find(c => c.id === clienteId);
    const originalValue = String((c || {})[field as keyof Cliente] ?? "");
    
    setPendingEdits(prev => {
      const clientEdits = { ...prev[clienteId] };
      
      if (newValue === originalValue) {
        delete clientEdits[field];
      } else {
        clientEdits[field] = value;
      }

      if (Object.keys(clientEdits).length === 0) {
        const newPrev = { ...prev };
        delete newPrev[clienteId];
        return newPrev;
      }

      return { ...prev, [clienteId]: clientEdits };
    });
  };

  const editedClientsCount = Object.keys(pendingEdits).length;
  const totalEditsCount = Object.values(pendingEdits).reduce((sum, edits) => sum + Object.keys(edits).length, 0);

  // Keyboard navigation logic
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.getElementById(`cell-${rowIndex + 1}-${colIndex}`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.getElementById(`cell-${rowIndex - 1}-${colIndex}`)?.focus();
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      document.getElementById(`cell-${rowIndex}-${colIndex + 1}`)?.focus();
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      document.getElementById(`cell-${rowIndex}-${colIndex - 1}`)?.focus();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveErrors({});
    let hasErrors = false;

    // We process each client sequentially to use the individual correction transaction
    for (const [clienteId, changes] of Object.entries(pendingEdits)) {
      const originalClient = clientes.find(c => c.id === clienteId);
      if (!originalClient) continue;

      // Validate with data-quality engine before sending to DB
      const draftClient = { ...originalClient, ...changes };
      const draftAnalysis = analyzeClientDatabase([draftClient]);
      
      // If the edited fields STILL generate critical/high errors, we block them.
      // But actually, the user requested: "Não permita salvar documento, telefone ou e-mail em formato inválido."
      const errorsOnChangedFields = draftAnalysis.clientIssues.filter(
        issue => Object.keys(changes).includes(issue.affectedField)
      );

      if (errorsOnChangedFields.length > 0) {
        setSaveErrors(prev => ({ 
          ...prev, 
// @ts-expect-error possible undefined

          [clienteId]: `Campo inválido: ${errorsOnChangedFields[0].description}` 
        }));
        hasErrors = true;
        continue;
      }

      const valoresAnteriores: Record<string, any> = {};
      Object.keys(changes).forEach(field => {
        valoresAnteriores[field] = (originalClient as any)[field];
      });

      try {
        const res = await serverExecuteCorrection({
          data: {
            clienteId,
            valoresAnteriores,
            valoresNovos: changes,
            motivoCorrecao: "Correção em Massa (Modo Planilha)"
          }
        });

        if (!(res as any).success) throw new Error((res as any).error || "Erro ao salvar");
        
        // Remove from pending edits if successful
        setPendingEdits(prev => {
          const newPrev = { ...prev };
          delete newPrev[clienteId];
          return newPrev;
        });

      } catch (err: any) {
        setSaveErrors(prev => ({ ...prev, [clienteId]: err.message }));
        hasErrors = true;
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["clientes"] });
    setIsSaving(false);
    
    if (!hasErrors) {
      setShowReview(false);
    }
  };

  const columns = [
    { key: "nome", label: "Nome", width: "w-64" },
    { key: "cpf_cnpj", label: "CPF/CNPJ", width: "w-40" },
    { key: "whatsapp", label: "WhatsApp / Tel", width: "w-40" },
    { key: "email", label: "E-mail", width: "w-52" },
    { key: "cidade", label: "Cidade", width: "w-40" },
    { key: "endereco", label: "Endereço", width: "w-64" },
    { key: "origem_lead", label: "Origem", width: "w-32" },
    { key: "marca_equipamento", label: "Marca", width: "w-40" },
    { key: "observacoes", label: "Observações", width: "w-64" }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] border rounded-lg bg-background overflow-hidden relative">
      
      {/* Pending Edits Toolbar */}
      {editedClientsCount > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-lg border border-accent/20 flex items-center gap-4 animate-in slide-in-from-top-4">
          <div className="text-sm font-medium">
            <span className="font-bold">{totalEditsCount}</span> células alteradas em <span className="font-bold">{editedClientsCount}</span> linhas
          </div>
          <div className="flex items-center gap-2 border-l border-accent-foreground/20 pl-4">
            <Button variant="ghost" size="sm" onClick={() => setPendingEdits({})} className="h-7 text-xs px-2 hover:bg-accent-foreground/10">
              Descartar
            </Button>
            <Button size="sm" onClick={() => setShowReview(true)} className="h-7 text-xs px-3 bg-background text-foreground hover:bg-background/90 shadow-sm">
              <Save className="mr-1.5 h-3 w-3" /> Revisar e Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Spreadsheet Container */}
      <div className="flex-1 overflow-auto bg-muted/10 relative" style={{ isolation: 'isolate' }}>
        <table className="w-full text-sm text-left border-collapse border-spacing-0">
          <thead className="text-xs uppercase bg-muted/80 sticky top-0 z-40 backdrop-blur-md shadow-sm">
            <tr>
              <th className="px-3 py-2 border-b font-medium text-muted-foreground w-12 text-center">#</th>
              {columns.map((col, idx) => (
                <th key={col.key} className={`px-2 py-2 border-b border-r font-medium text-muted-foreground ${col.width} ${idx === 0 ? 'sticky left-0 z-30 bg-muted/80 backdrop-blur-md border-r-2 border-r-border/60' : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentClients.map((client, rowIdx) => {
              const globalIndex = (page - 1) * pageSize + rowIdx + 1;
              const hasEdits = !!pendingEdits[client.id];
              
              return (
                <tr key={client.id} className={`hover:bg-muted/50 transition-colors ${hasEdits ? 'bg-warning/5' : ''}`}>
                  <td className="px-3 py-1 border-b text-center text-xs text-muted-foreground font-mono bg-background/50">
                    {globalIndex}
                  </td>
                  {columns.map((col, colIdx) => {
                    const originalValue = String((client as any)[col.key] ?? "");
                    const editedValue = pendingEdits[client.id]?.[col.key];
                    const isEdited = editedValue !== undefined;
                    const displayValue = isEdited ? editedValue : originalValue;

                    return (
                      <td 
                        key={col.key} 
                        className={`p-0 border-b border-r bg-background relative focus-within:z-20 focus-within:ring-2 focus-within:ring-primary focus-within:ring-inset ${colIdx === 0 ? 'sticky left-0 z-20 border-r-2 border-r-border/60' : ''}`}
                      >
                        <input
                          id={`cell-${rowIdx}-${colIdx}`}
                          type="text"
                          value={displayValue}
                          onChange={(e) => handleEdit(client.id, col.key, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                          className={`w-full h-9 px-2 text-sm bg-transparent outline-none truncate placeholder:text-muted-foreground/30 ${isEdited ? 'font-medium text-warning-foreground bg-warning/10' : ''}`}
                          placeholder={originalValue ? '' : '—'}
                          title={displayValue}
                        />
                        {isEdited && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-warning rounded-bl-sm" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
        <div className="text-xs text-muted-foreground">
          Mostrando {(page - 1) * pageSize + 1} até {Math.min(page * pageSize, clientes.length)} de {clientes.length} registros
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium px-2">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Revisar e Salvar Alterações</DialogTitle>
            <DialogDescription>
              Revise cuidadosamente os dados modificados. Cada linha será salva criando auditoria e backup individual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto py-4 space-y-6">
            {Object.entries(pendingEdits).map(([clienteId, changes]) => {
              const client = clientes.find(c => c.id === clienteId)!;
              const error = saveErrors[clienteId];
              
              return (
                <div key={clienteId} className={`border rounded-lg p-4 space-y-3 ${error ? 'border-destructive bg-destructive/5' : 'bg-muted/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{client.nome}</div>
                    {error && <Badge variant="destructive" className="text-[10px]">Erro ao salvar</Badge>}
                  </div>
                  
                  {error && (
                    <div className="text-xs text-destructive flex items-start gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid gap-2">
                    {Object.entries(changes).map(([field, newValue]) => {
                      const oldValue = String((client as any)[field] ?? "");
                      const colLabel = columns.find(c => c.key === field)?.label || field;
                      
                      return (
                        <div key={field} className="grid grid-cols-[100px_1fr_auto_1fr] gap-3 items-center text-sm p-2 bg-background border rounded">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{colLabel}</div>
                          <div className="font-mono text-muted-foreground line-through truncate px-2" title={oldValue}>{oldValue || "Vazio"}</div>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <div className="font-mono font-medium truncate px-2 text-warning-foreground" title={newValue}>{newValue || "Vazio"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowReview(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? "Salvando lote..." : <><CheckCircle2 className="h-4 w-4" /> Confirmar Alterações Definitivas</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
