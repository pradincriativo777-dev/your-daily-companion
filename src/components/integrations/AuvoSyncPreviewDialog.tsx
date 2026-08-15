import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PreviewItem {
  auvoId: string | number;
  status: "Correspondência Provável" | "Novo no CRM" | "Conflito" | "Inválido" | "Já Vinculado";
  crmId?: string;
  matchReason?: string;
}

interface Totais {
  vinculados: number;
  provaveis: number;
  novos: number;
  conflitos: number;
  invalidos: number;
}

interface AuvoSyncPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: PreviewItem[];
  totais: Totais;
}

export function AuvoSyncPreviewDialog({ open, onOpenChange, previewData, totais }: AuvoSyncPreviewDialogProps) {
  const getBadgeVariant = (status: PreviewItem["status"]) => {
    switch (status) {
      case "Já Vinculado": return "default";
      case "Correspondência Provável": return "secondary";
      case "Novo no CRM": return "outline";
      case "Conflito": return "destructive";
      case "Inválido": return "destructive";
      default: return "default";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Simulação de Sincronização (Dry-Run)</DialogTitle>
          <DialogDescription>
            Resultados da análise de correspondência entre o AUVO e o CRM JANSOL. Nenhuma informação foi alterada.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-4">
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Novos</p>
            <p className="text-2xl font-bold">{totais.novos}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Prováveis</p>
            <p className="text-2xl font-bold">{totais.provaveis}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Vinculados</p>
            <p className="text-2xl font-bold">{totais.vinculados}</p>
          </div>
          <div className="bg-destructive/10 p-4 rounded-lg text-center">
            <p className="text-sm text-destructive font-semibold">Conflitos</p>
            <p className="text-2xl font-bold text-destructive">{totais.conflitos}</p>
          </div>
          <div className="bg-destructive/10 p-4 rounded-lg text-center">
            <p className="text-sm text-destructive font-semibold">Inválidos</p>
            <p className="text-2xl font-bold text-destructive">{totais.invalidos}</p>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID AUVO</TableHead>
                <TableHead>Status (Preview)</TableHead>
                <TableHead>Motivo / Regra</TableHead>
                <TableHead>ID CRM Destino</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">{item.auvoId}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.matchReason || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.crmId || "-"}</TableCell>
                </TableRow>
              ))}
              {previewData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    Nenhum dado retornado na simulação.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar simulação
          </Button>
          <Button disabled variant="secondary" title="Sincronização real indisponível nesta fase">
            Sincronizar (Bloqueado)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
