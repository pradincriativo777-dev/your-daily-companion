import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus, Shield, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, Loading, EmptyState } from "@/components/crm/ui";
import { fetchUsuariosServer, toggleUsuarioStatusServer, UsuarioPerfilRow } from "@/lib/usuarios.server";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de Usuários · JANSOL Admin" },
      { name: "description", content: "Gerenciamento de usuários, convites e perfis de acesso reais." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioPerfilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const res = await (fetchUsuariosServer as any)();
      setUsuarios(res || []);
    } catch (err: any) {
      toast.error("Erro ao carregar usuários reais do servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleToggleAtivo = async (id: string, statusAtual: boolean) => {
    setProcessando(id);
    try {
      await (toggleUsuarioStatusServer as any)({ data: { usuarioId: id, novoStatus: !statusAtual } });
      toast.success(`Status do usuário atualizado para ${!statusAtual ? "Ativo" : "Desativado"}.`);
      carregarUsuarios();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do usuário.");
    } finally {
      setProcessando(null);
    }
  };

  const handleEnviarConvite = () => {
    toast.info("Em ambiente de produção, convites são processados via Supabase Auth Admin.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Usuários & Equipe"
        description="Gerencie os usuários autorizados do CRM JANSOL, convites e status de acesso no servidor."
      >
        <Button onClick={handleEnviarConvite} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <UserPlus className="mr-1.5 h-4 w-4" /> Convidar Usuário
        </Button>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Usuários Autenticados Reais
            </CardTitle>
            <CardDescription>
              Controle de contas com permissões de login ativas no banco de dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil / Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado Em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        <Shield className="mr-1 h-3 w-3 text-primary" />
                        {u.perfil}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.ativo ? (
                        <Badge variant="default" className="bg-emerald-600">
                          <CheckCircle className="mr-1 h-3 w-3" /> Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-slate-500">
                          <XCircle className="mr-1 h-3 w-3" /> Desativado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={processando === u.id}
                        onClick={() => handleToggleAtivo(u.id, u.ativo)}
                      >
                        {u.ativo ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {usuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState title="Nenhum usuário cadastrado" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
