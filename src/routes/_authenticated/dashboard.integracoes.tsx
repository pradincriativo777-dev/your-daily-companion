import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plug, KeyRound, AlertTriangle, CheckCircle2, Activity, PlaySquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getIntegrationsStatus, testAuvoConnection, simulateAuvoSync, getAuvoLogs } from "@/lib/integrations/auvo.server";
import { AuvoSyncPreviewDialog } from "@/components/integrations/AuvoSyncPreviewDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/integracoes")({
  component: IntegracoesPage,
});

function IntegracoesPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  
  // Auvo Modal states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [previewData, setPreviewData] = useState<any>({ totais: {}, preview: [] });
  
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsData, setLogsData] = useState<any[]>([]);

  const loadStatus = async () => {
    try {
      const res = await getIntegrationsStatus();
      setStatus(res);
    } catch (err: any) {
      toast.error("Erro ao carregar status: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestAuvo = async () => {
    setTesting(true);
    try {
      const res = await testAuvoConnection();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(`Falha na conexão: ${res.error}`);
      }
      await loadStatus(); // refresh status
    } catch (err: any) {
      toast.error("Erro crítico: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSimulateAuvo = async () => {
    setSimulating(true);
    try {
      const res = await simulateAuvoSync();
      if (res.success) {
        setPreviewData({ totais: res.totais, preview: res.preview });
        setPreviewOpen(true);
      } else {
        toast.error(`Falha na simulação: ${res.error}`);
      }
      await loadStatus();
    } catch (err: any) {
      toast.error("Erro crítico na simulação: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  const handleViewLogs = async () => {
    try {
      const logs = await getAuvoLogs();
      setLogsData(logs);
      setLogsOpen(true);
    } catch (err: any) {
      toast.error("Erro ao carregar logs: " + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando integrações...</div>;
  }

  const auvo = status?.auvo || {};

  return (
    <div className="flex flex-col h-full gap-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Central de Integrações</h2>
          <p className="text-muted-foreground">
            Gerencie conexões de leitura e sincronização com plataformas externas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {/* AUVO Card */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                AUVO
              </CardTitle>
              {auvo.status === "Conectada" ? (
                <Badge variant="default" className="bg-green-600">Conectada</Badge>
              ) : auvo.status === "Configurada" ? (
                <Badge variant="secondary">Configurada</Badge>
              ) : auvo.status === "Erro de autenticação" ? (
                <Badge variant="destructive">Erro de Autenticação</Badge>
              ) : (
                <Badge variant="outline">Não configurada</Badge>
              )}
            </div>
            <CardDescription>
              Integração com ERP Auvo para sincronização de visitas, técnicos e agenda. (Somente leitura)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                <span>Credenciais no servidor: {auvo.configured ? "Detectadas" : "Ausentes"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Último teste: {auvo.lastCheck ? format(new Date(auvo.lastCheck), "dd/MM/yyyy HH:mm") : "Nunca"}</span>
              </div>
            </div>

            {!auvo.configured && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <p>Variáveis ausentes no host: <br/><code className="font-mono text-xs">AUVO_APP_KEY, AUVO_TOKEN</code></p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 items-stretch border-t p-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleTestAuvo} 
                disabled={testing}
              >
                {testing ? "Testando..." : "Testar Conexão"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleViewLogs}
                title="Ver logs da integração"
              >
                Ver Logs
              </Button>
            </div>
            <Button 
              className="w-full gap-2" 
              disabled={simulating || !auvo.configured}
              onClick={handleSimulateAuvo}
            >
              <PlaySquare className="h-4 w-4" />
              {simulating ? "Simulando..." : "Simular Sincronização"}
            </Button>
          </CardFooter>
        </Card>

        {/* Conta Azul Card */}
        <Card className="opacity-75">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Plug className="h-5 w-5" />
                Conta Azul
              </CardTitle>
              <Badge variant="outline">Em breve</Badge>
            </div>
            <CardDescription>
              Integração para orçamentos e financeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">Disponível em futuras atualizações.</p>
          </CardContent>
          <CardFooter className="border-t p-4">
            <Button variant="outline" className="w-full" disabled>Configurar</Button>
          </CardFooter>
        </Card>

        {/* Microsoft Card */}
        <Card className="opacity-75">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Plug className="h-5 w-5" />
                Microsoft 365
              </CardTitle>
              <Badge variant="outline">Em breve</Badge>
            </div>
            <CardDescription>
              Integração com OneDrive e Excel para relatórios automáticos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">Disponível em futuras atualizações.</p>
          </CardContent>
          <CardFooter className="border-t p-4">
            <Button variant="outline" className="w-full" disabled>Configurar</Button>
          </CardFooter>
        </Card>
      </div>

      <AuvoSyncPreviewDialog 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
        previewData={previewData.preview} 
        totais={previewData.totais} 
      />

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Logs de Integração - AUVO</DialogTitle>
            <DialogDescription>
              Histórico efêmero das últimas operações realizadas no conector.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-md mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.data), "dd/MM HH:mm:ss")}</TableCell>
                    <TableCell className="font-medium text-xs">{log.operacao}</TableCell>
                    <TableCell>
                      <Badge variant={log.resultado === "SUCCESS" ? "default" : "destructive"}>
                        {log.resultado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {log.errorCode || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.duracao}ms</TableCell>
                  </TableRow>
                ))}
                {logsData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhum log registrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
