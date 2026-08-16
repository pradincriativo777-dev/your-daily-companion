import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, Clock, AlertCircle, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Loading, EmptyState } from "@/components/crm/ui";
import { Badge } from "@/components/ui/badge";
import { fetchTarefasServer, upsertTarefaServer } from "@/lib/tarefas.server";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/tarefas")({
  head: () => ({
    meta: [
      { title: "Central de Tarefas & Pendências · JANSOL Admin" },
      { name: "description", content: "Central de tarefas operacionais reais do CRM JANSOL." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TarefasPage,
});

function TarefasPage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarTarefas = async () => {
    setLoading(true);
    try {
      const res = await fetchTarefasServer();
      setTarefas(res || []);
    } catch (err) {
      toast.error("Erro ao carregar tarefas do servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTarefas();
  }, []);

  const handleConcluir = async (id: string, statusAtual: string) => {
    const novoStatus = statusAtual === "Concluída" ? "Pendente" : "Concluída";
    try {
      await (upsertTarefaServer as any)({ data: { id, status: novoStatus as any, titulo: "Tarefa" } });
      toast.success(`Tarefa marcada como ${novoStatus}.`);
      carregarTarefas();
    } catch (err) {
      toast.error("Falha ao atualizar tarefa.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Tarefas & Pendências"
        description="Acompanhamento operacional de pendências de ordens, visitas e manutenções."
      />

      {loading ? (
        <Loading />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Pendências Operacionais
            </CardTitle>
            <CardDescription>
              Tarefas reais registradas na base do CRM JANSOL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tarefas.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded border bg-card">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleConcluir(t.id, t.status)}
                    className="h-8 w-8 text-primary"
                  >
                    <CheckCircle2 className={`h-5 w-5 ${t.status === "Concluída" ? "text-emerald-600 fill-emerald-100" : "text-slate-400"}`} />
                  </Button>
                  <div>
                    <p className={`font-semibold text-sm ${t.status === "Concluída" ? "line-through text-muted-foreground" : ""}`}>
                      {t.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.descricao || "Sem descrição."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.prioridade === "Alta" ? "destructive" : "secondary"}>
                    {t.prioridade || "Média"}
                  </Badge>
                  <Badge variant="outline">{t.status}</Badge>
                </div>
              </div>
            ))}

            {tarefas.length === 0 && (
              <EmptyState
                title="Nenhuma tarefa pendente"
                description="Todas as pendências operacionais estão em dia."
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
