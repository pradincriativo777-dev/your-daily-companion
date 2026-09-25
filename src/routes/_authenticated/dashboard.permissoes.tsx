import { createFileRoute } from "@tanstack/react-router";
import { Shield, Check, X, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/crm/ui";
import { MATRIZ_PERMISSOES, PERFIS_SISTEMA, PerfilUsuario } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/dashboard/permissoes")({
  head: () => ({
    meta: [
      { title: "Matriz de Permissões (RBAC) · JANSOL Admin" },
      { name: "description", content: "Matriz de permissões e controle de acesso por módulo." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PermissoesPage,
});

const MODULOS_LABEL: Record<string, string> = {
  dashboard: "Dashboard Geral",
  clientes: "Clientes & CRM",
  ordens: "Ordens de Serviço",
  estoque: "Estoque & Peças",
  equipamentos: "Equipamentos & Garantias",
  manutencoes: "Manutenções Preventivas",
  gastos: "Financeiro / Gastos",
  usuarios: "Gestão de Usuários",
  permissoes: "Matriz de Permissões",
  configuracoes: "Configurações do Sistema",
};

function PermissoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriz de Funções & Permissões (RBAC)"
        description="Visualização oficial do controle de acesso por módulo e ação para cada perfil."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Matriz de Controle por Perfil
          </CardTitle>
          <CardDescription>
            Permissões validadas estritamente no servidor e no banco de dados Supabase via RLS.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-56">Módulo / Recurso</TableHead>
                {PERFIS_SISTEMA.map((perfil) => (
                  <TableHead key={perfil} className="text-center font-bold">
                    {perfil}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(MODULOS_LABEL).map(([modKey, modNome]) => (
                <TableRow key={modKey}>
                  <TableCell className="font-semibold text-sm">{modNome}</TableCell>
                  {PERFIS_SISTEMA.map((perfil: PerfilUsuario) => {
                    const p = MATRIZ_PERMISSOES[perfil][modKey];
                    const podeVer = p?.visualizar;
                    const podeEditar = p?.editar;

                    return (
                      <TableCell key={perfil} className="text-center">
                        {podeVer ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                            <Check className="mr-1 h-3 w-3" />
                            {podeEditar ? "Total" : "Leitura"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                            <X className="mr-1 h-3 w-3" /> Negado
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
