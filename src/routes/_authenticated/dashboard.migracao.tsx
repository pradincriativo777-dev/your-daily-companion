import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const executarMigracaoSegura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Fazer backup na memória
    const { data: clientes, error: fetchError } = await supabaseAdmin
      .from("clientes")
      .select("*");
    
    if (fetchError) throw new Error("Erro ao ler clientes: " + fetchError.message);
    
    if (!clientes || clientes.length === 0) {
      return { success: true, message: "Nenhum cliente para migrar." };
    }

    // Se já possuem origem, não migrar novamente
    if (clientes[0].origem_importacao) {
      return { success: true, message: "Clientes já foram migrados." };
    }

    // 2. Limpar a tabela
    const { error: deleteError } = await supabaseAdmin
      .from("clientes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Deleta todos

    if (deleteError) throw new Error("Erro ao limpar tabela: " + deleteError.message);

    // 3. Preparar novos dados
    const novosClientes = clientes.map(c => ({
      ...c,
      origem_importacao: "MIGRACAO-INICIAL-817"
    }));

    // 4. Inserir novamente
    const { error: insertError } = await supabaseAdmin
      .from("clientes")
      .insert(novosClientes);

    if (insertError) throw new Error("Erro ao re-inserir: " + insertError.message);

    return { success: true, count: novosClientes.length, message: "Migração concluída com sucesso!" };
  });

export const Route = createFileRoute("/_authenticated/dashboard/migracao")({
  component: MigracaoPage,
});

function MigracaoPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleMigracao = async () => {
    if (!confirm("Isso apagará e reescreverá todos os clientes. Tem certeza?")) return;
    setLoading(true);
    try {
      const res = await executarMigracaoSegura();
      setMsg(res.message + (res.count ? ` (${res.count} clientes)` : ""));
    } catch (e: any) {
      setMsg("Erro: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Migração Segura de Clientes</h1>
      <p className="mb-4">Este botão executará o backup na memória, truncará a tabela e reimportará todos os clientes com a marcação de origem.</p>
      <Button onClick={handleMigracao} disabled={loading}>
        {loading ? "Executando..." : "Executar Migração agora"}
      </Button>
      {msg && <p className="mt-4 font-mono bg-muted p-2 rounded">{msg}</p>}
    </div>
  );
}
