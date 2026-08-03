import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConfirmDelete,
  EmptyState,
  Loading,
  PageHeader,
} from "@/components/crm/ui";
import { TecnicoDialog } from "@/components/crm/TecnicoManutencaoDialogs";
import { formatCurrency } from "@/lib/crm";
import {
  useClientes,
  useManutencoes,
  useRemove,
  useTecnicos,
  type Tecnico,
} from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/tecnicos/")({
  head: () => ({
    meta: [
      { title: "Técnicos · JANSOL Admin" },
      {
        name: "description",
        content: "Equipe técnica da JANSOL, custos e produtividade.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TecnicosPage,
});

function TecnicosPage() {
  const { data: tecnicos = [], isLoading } = useTecnicos();
  const { data: clientes = [] } = useClientes();
  const { data: manutencoes = [] } = useManutencoes();
  const remove = useRemove("tecnicos");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Tecnico | null>(null);

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader title="Técnicos" description={`${tecnicos.length} técnico(s) cadastrado(s)`}>
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Técnico
        </Button>
      </PageHeader>

      <Card className="overflow-hidden py-0">
        {tecnicos.length === 0 ? (
          <EmptyState
            title="Nenhum técnico cadastrado"
            description="Cadastre sua equipe para acompanhar custos e produtividade."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Custo Mensal</TableHead>
                  <TableHead className="text-right">Instalações</TableHead>
                  <TableHead className="text-right">Manutenções</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tecnicos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link
                        to="/dashboard/tecnicos/$id"
                        params={{ id: t.id }}
                        className="font-medium hover:text-accent"
                      >
                        {t.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{t.telefone ?? "—"}</TableCell>
                    <TableCell>{t.especialidade}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          t.status === "Ativo"
                            ? "border-success/50 bg-success/20"
                            : "border-border bg-muted"
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(t.custo_mensal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {clientes.filter((c) => c.tecnico_id === t.id).length}
                    </TableCell>
                    <TableCell className="text-right">
                      {manutencoes.filter((m) => m.tecnico_id === t.id).length}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(t);
                            setDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete
                          onConfirm={() => remove.mutate(t.id)}
                          description={`O técnico "${t.nome}" será excluído e desvinculado dos registros.`}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <TecnicoDialog open={dialog} onOpenChange={setDialog} tecnico={editing} />
    </div>
  );
}
