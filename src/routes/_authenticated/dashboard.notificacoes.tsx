import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Info, AlertTriangle, ShieldCheck, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Loading, EmptyState } from "@/components/crm/ui";
import { Badge } from "@/components/ui/badge";
import { fetchNotificacoesServer, marcarNotificacoesLidasServer } from "@/lib/notificacoes.server";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/notificacoes")({
  head: () => ({
    meta: [
      { title: "Central de Notificações · JANSOL Admin" },
      { name: "description", content: "Notificações e alertas do sistema JANSOL." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificacoesPage,
});

function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarNotificacoes = async () => {
    setLoading(true);
    try {
      const res = await fetchNotificacoesServer();
      setNotificacoes(res || []);
    } catch (err) {
      toast.error("Erro ao carregar notificações do servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
  }, []);

  const handleMarcarTodasLidas = async () => {
    try {
      await (marcarNotificacoesLidasServer as any)({ data: {} });
      toast.success("Todas as notificações foram marcadas como lidas.");
      carregarNotificacoes();
    } catch (err) {
      toast.error("Falha ao atualizar notificações.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Notificações"
        description="Histórico de alertas de sistema, segurança e notificações operacionais."
      >
        <Button variant="outline" size="sm" onClick={handleMarcarTodasLidas}>
          <CheckCheck className="mr-1.5 h-4 w-4 text-primary" /> Marcar todas como lidas
        </Button>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações do Sistema
            </CardTitle>
            <CardDescription>
              Alertas e comunicados reais registrados no servidor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificacoes.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded border ${n.lida ? "bg-card opacity-70" : "bg-card border-primary/40 font-medium"}`}>
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{n.mensagem}</p>
                    <Badge variant={n.lida ? "secondary" : "default"}>{n.tipo || "Sistema"}</Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}

            {notificacoes.length === 0 && (
              <EmptyState
                title="Nenhuma notificação nova"
                description="Você está em dia com todos os alertas do sistema."
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
