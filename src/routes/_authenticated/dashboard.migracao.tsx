import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Card } from "@/components/ui/card";

// RPC Dry Run - Apenas lê e não modifica nada (Garantido pelo RPC)
const simularMigracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    try {
      const { data, error } = await ctx.context.supabase.rpc("execute_migration_dry_run");
      if (error) throw new Error(error.message);
      return { success: true, payload: data };
    } catch (e: any) {
      console.error(`[Migration DryRun Error] Usuário ${ctx.context.userId}:`, e.message || e);
      return { success: false, error: "Ocorreu um erro ao simular a migração. Consulte os logs do servidor." };
    }
  });

// RPC Execute - Transacional
const efetivarMigracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (ctx) => {
    const opId = ctx.data;
    try {
      const { data, error } = await ctx.context.supabase.rpc("execute_migration_real", { p_operation_id: opId });
      if (error) throw new Error(error.message);
      return { success: true, payload: data };
    } catch (e: any) {
      console.error(`[Migration Execute Error] Usuário ${ctx.context.userId}:`, e.message || e);
      return { success: false, error: "Falha na migração real. Operação cancelada com segurança (Rollback). Consulte os logs." };
    }
  });

export const Route = createFileRoute("/_authenticated/dashboard/migracao")({
  component: MigracaoPage,
});

function MigracaoPage() {
  const [loading, setLoading] = useState(false);
  const [simulacao, setSimulacao] = useState<any>(null);
  const [confirmText, setConfirmText] = useState("");
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);

  const operationId = "MIGRACAO-INICIAL-817";

  const handleSimular = async () => {
    setLoading(true);
    setMsg("");
    setSimulacao(null);
    const res = await simularMigracao();
    if (res.success) {
      setSimulacao(res.payload);
      setIsError(false);
    } else {
      setMsg(res.error || "Erro na simulação.");
      setIsError(true);
    }
    setLoading(false);
  };

  const handleEfetivar = async () => {
    if (confirmText !== "MIGRAR 817 CLIENTES") return;
    setLoading(true);
    setMsg("");
    const res = await efetivarMigracao({ data: operationId });
    if (res.success) {
      setMsg(`Sucesso! ${res.payload.total_atualizados} clientes atualizados. ID da Operação: ${res.payload.operation_id}. Os backups estão na tabela clientes_backup.`);
      setIsError(false);
      setSimulacao(null);
      setConfirmText("");
    } else {
      setMsg(res.error || "Erro ao efetivar.");
      setIsError(true);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Assistente de Migração Segura</h1>
      <p className="text-muted-foreground">
        Esta ferramenta executa a anexação do identificador de importação de maneira transacional, 
        preservando IDs e criando backups automáticos de auditoria. Nenhum delete em massa (TRUNCATE) será realizado.
      </p>

      <Card className="p-6 border-accent/20 bg-accent/5">
        <h2 className="text-xl font-semibold mb-4">Passo 1: Simulação (Dry-Run)</h2>
        <Button onClick={handleSimular} disabled={loading} variant="outline">
          {loading && !simulacao ? "Analisando banco..." : "Simular Migração (Dry-Run)"}
        </Button>

        {simulacao && (
          <div className="mt-6 space-y-2 bg-card p-4 rounded border font-mono text-sm">
            <p><strong>Origem dos Dados:</strong> {simulacao.origem}</p>
            <p><strong>Quantidade na Fonte:</strong> {simulacao.quantidade_fonte}</p>
            <p><strong>Quantidade Atual no Banco:</strong> {simulacao.quantidade_atual}</p>
            <hr className="my-2" />
            <p className="text-green-600"><strong>Registros Válidos:</strong> {simulacao.validos}</p>
            <p className="text-red-500"><strong>Registros Inválidos (Sem Nome):</strong> {simulacao.invalidos}</p>
            <p><strong>Duplicados na Fonte:</strong> {simulacao.duplicados}</p>
            <p><strong>Novos a Inserir:</strong> {simulacao.novos}</p>
            <p><strong>Registros a Atualizar (Tag):</strong> {simulacao.atualizados}</p>
            <p><strong>Conflitos Previstos:</strong> {simulacao.conflitos}</p>
            <hr className="my-2" />
            <p><strong>Correções Necessárias:</strong> {simulacao.correcoes_necessarias}</p>
          </div>
        )}
      </Card>

      {simulacao && simulacao.conflitos === 0 && (
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Passo 2: Execução Real</h2>
          <p className="text-sm mb-4 text-red-600 dark:text-red-400">
            Atenção: A execução criará um backup em 'clientes_backup' e atualizará a tabela principal 'clientes' 
            com o ID da operação dentro de uma única transação segura (Rollback integral em caso de falha).
          </p>
          <div className="flex flex-col space-y-4 max-w-sm">
            <label className="text-sm font-medium">
              Digite "MIGRAR 817 CLIENTES" para confirmar:
            </label>
            <Input 
              value={confirmText} 
              onChange={(e) => setConfirmText(e.target.value)} 
              placeholder="Digite aqui..." 
              className="bg-background"
            />
            <Button 
              onClick={handleEfetivar} 
              disabled={loading || confirmText !== "MIGRAR 817 CLIENTES"}
              variant="destructive"
            >
              {loading && confirmText === "MIGRAR 817 CLIENTES" ? "Migrando..." : "Executar Migração Real"}
            </Button>
          </div>
        </Card>
      )}

      {msg && (
        <div className={`p-4 rounded border font-medium ${isError ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}`}>
          {msg}
        </div>
      )}
    </div>
  );
}
