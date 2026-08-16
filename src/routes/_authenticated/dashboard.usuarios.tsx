import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus, Shield, CheckCircle, XCircle, Mail, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/crm/ui";
import { PERFIS_SISTEMA, PerfilUsuario } from "@/lib/rbac";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de Usuários · JANSOL Admin" },
      { name: "description", content: "Gerenciamento de usuários, convites e perfis de acesso." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UsuariosPage,
});

interface UsuarioMock {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  ultimoAcesso: string;
}

const USUARIOS_INICIAIS: UsuarioMock[] = [
  {
    id: "usr-1",
    nome: "Administrador JANSOL",
    email: "admin@jansol.com.br",
    perfil: "Administrador",
    ativo: true,
    ultimoAcesso: "Hoje às 15:30",
  },
  {
    id: "usr-2",
    nome: "Carlos Eduardo",
    email: "carlos.gestor@jansol.com.br",
    perfil: "Gestor",
    ativo: true,
    ultimoAcesso: "Ontem às 18:10",
  },
  {
    id: "usr-3",
    nome: "Ana Paula Silva",
    email: "atendimento@jansol.com.br",
    perfil: "Atendimento",
    ativo: true,
    ultimoAcesso: "Hoje às 11:20",
  },
  {
    id: "usr-4",
    nome: "Marcos Técnico",
    email: "tecnico@jansol.com.br",
    perfil: "Técnico",
    ativo: true,
    ultimoAcesso: "12/08 às 09:00",
  },
];

function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioMock[]>(USUARIOS_INICIAIS);

  const toggleAtivo = (id: string) => {
    setUsuarios((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          if (u.perfil === "Administrador" && u.ativo) {
            toast.error("O usuário Administrador Principal não pode ser desativado.");
            return u;
          }
          const novoStatus = !u.ativo;
          toast.success(`Usuário ${u.nome} ${novoStatus ? "ativado" : "desativado"} com sucesso.`);
          return { ...u, ativo: novoStatus };
        }
        return u;
      }),
    );
  };

  const enviarConvite = () => {
    toast.success("Link de convite enviado por e-mail!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Usuários & Equipe"
        description="Gerencie os usuários autorizados do CRM JANSOL, convites e status de acesso."
      >
        <Button onClick={enviarConvite} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <UserPlus className="mr-1.5 h-4 w-4" /> Convidar Usuário
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Usuários Cadastrados
          </CardTitle>
          <CardDescription>
            Controle de contas com permissões de login e auditoria de acesso.
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
                <TableHead>Último Acesso</TableHead>
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
                  <TableCell className="text-xs text-muted-foreground">{u.ultimoAcesso}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAtivo(u.id)}
                      title={u.ativo ? "Desativar acesso" : "Ativar acesso"}
                    >
                      {u.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
