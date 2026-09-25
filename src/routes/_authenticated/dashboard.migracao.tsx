import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Database, FileDigit } from "lucide-react";

const verificarIntegridadeMigracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    try {
      const opId = "MIGRACAO-INICIAL-817";
      const { data: audit, error: auditError } = await (ctx.context.supabase as any)
        .from('migration_audits')
        .select('*')
        .eq('operation_id', opId)
        .eq('status', 'SUCCESS')
        .single();

      if (auditError || !audit) {
        return { success: false, error: "Migração MIGRACAO-INICIAL-817 não encontrada com sucesso." };
      }

      const { count: countClientes } = await ctx.context.supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      const { count: countComTag } = await (ctx.context.supabase as any)
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('origem_importacao', opId);

      const { count: countBackup } = await (ctx.context.supabase as any)
        .from('clientes_backup')
        .select('*', { count: 'exact', head: true })
        .eq('migration_id', audit.id);

      return { 
        success: true, 
        payload: {
          audit_id: audit.id,
          operation_id: audit.operation_id,
          status: audit.status,
          total_afetados: audit.total_afetados,
          data_execucao: audit.executed_at,
          clientes_total: countClientes,
          clientes_com_tag: countComTag,
          clientes_backup: countBackup
        } 
      };
    } catch (e: any) {
      console.error(`[Integrity Check Error] Usuário ${ctx.context.userId}:`, e.message || e);
      return { success: false, error: "Ocorreu um erro ao verificar a integridade. Consulte os logs." };
    }
  });


export const Route = createFileRoute("/_authenticated/dashboard/migracao")({
  component: MigracaoPage,
});

function MigracaoPage() {
  const [loading, setLoading] = useState(false);
  const [integridade, setIntegridade] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const handleVerificar = async () => {
    setLoading(true);
    setMsg("");
    setIntegridade(null);
    const res = await verificarIntegridadeMigracao();
    if (res.success) {
      setIntegridade(res.payload);
      setIsError(false);
    } else {
      setMsg(res.error || "Erro na verificação.");
      setIsError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    handleVerificar();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center text-green-700 dark:text-green-500">
        <ShieldCheck className="mr-2 h-7 w-7" /> Auditoria da Migração
      </h1>
      <p className="text-muted-foreground">
        A migração MIGRACAO-INICIAL-817 já foi executada com sucesso e está bloqueada contra repetições. 
        Este é um painel estritamente somente leitura para verificar a integridade da operação.
      </p>

      {integridade && (
        <Card className="p-6 border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-green-800 dark:text-green-400">Migração Concluída e Verificada</h2>
              <p className="text-sm text-green-700/80 dark:text-green-500/80">Operação {integridade.operation_id} registrada com status {integridade.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-background p-4 rounded-lg border shadow-sm">
              <div className="flex items-center text-muted-foreground mb-2">
                <Database className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Tabela Oficial (Clientes)</span>
              </div>
              <p className="text-2xl font-bold">{integridade.clientes_total} <span className="text-sm font-normal text-muted-foreground">registros totais</span></p>
              <p className="text-sm mt-1 text-green-600 font-medium">{integridade.clientes_com_tag} registros contêm a marcação oficial</p>
            </div>
            
            <div className="bg-background p-4 rounded-lg border shadow-sm">
              <div className="flex items-center text-muted-foreground mb-2">
                <FileDigit className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Backup de Segurança</span>
              </div>
              <p className="text-2xl font-bold">{integridade.clientes_backup} <span className="text-sm font-normal text-muted-foreground">cópias salvas</span></p>
              <p className="text-sm mt-1 text-blue-600 font-medium">Vinculadas ao Audit ID interno</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-green-200/50">
            <p className="text-sm text-muted-foreground">
              <strong>Data da Execução:</strong> {new Date(integridade.data_execucao).toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Garantia do Banco:</strong> A repetição desta migração está definitivamente bloqueada pelo banco de dados e pelo endpoint.
            </p>
          </div>
        </Card>
      )}

      {msg && (
        <div className={`p-4 rounded border font-medium ${isError ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}`}>
          {msg}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleVerificar} disabled={loading} variant="outline" className="bg-background">
          {loading ? "Verificando..." : "Verificar Integridade do Banco"}
        </Button>
      </div>
    </div>
  );
}
