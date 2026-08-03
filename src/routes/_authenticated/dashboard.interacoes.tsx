import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Pagination,
} from "@/components/crm/ui";
import { FilterSelect } from "./dashboard.clientes.index";
import { InteracaoDialog } from "@/components/crm/GastoInteracaoDialogs";
import {
  TIPOS_INTERACAO,
  daysSince,
  formatDate,
  todayISO,
} from "@/lib/crm";
import {
  useClientes,
  useInteracoes,
  useRemove,
  type Interacao,
} from "@/hooks/use-crm";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/interacoes")({
  head: () => ({
    meta: [
      { title: "Interações · JANSOL Admin" },
      {
        name: "description",
        content: "Histórico de contatos com clientes e próximos follow-ups.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InteracoesPage,
});

const PAGE_SIZE = 25;

function InteracoesPage() {
  const { data: interacoes = [], isLoading } = useInteracoes();
  const { data: clientes = [] } = useClientes();
  const remove = useRemove("interacoes");

  const [fCliente, setFCliente] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Interacao | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const nomeCliente = (id: string) =>
    clientes.find((c) => c.id === id)?.nome ?? "—";

  const semContato = clientes.filter((c) => {
    const d = daysSince(c.ultimo_contato);
    return c.status !== "Finalizado" && (d === null || d > 30);
  });

  const filtrados = useMemo(() => {
    const list = interacoes.filter(
      (i) =>
        (fCliente === "todos" || i.cliente_id === fCliente) &&
        (fTipo === "todos" || i.tipo === fTipo) &&
        (!de || i.data_interacao >= de) &&
        (!ate || i.data_interacao <= ate),
    );
    return [...list].sort((a, b) => {
      const av = a.data_proximo_contato ?? "9999-12-31";
      const bv = b.data_proximo_contato ?? "9999-12-31";
      return av.localeCompare(bv);
    });
  }, [interacoes, fCliente, fTipo, de, ate]);

  const pageCount = Math.ceil(filtrados.length / PAGE_SIZE);
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hoje = todayISO();

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Interações com Clientes"
        description="Ordenadas pelo próximo contato mais urgente."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Nova Interação
        </Button>
      </PageHeader>

      {semContato.length > 0 && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Clientes sem contato há mais de
            30 dias
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {semContato.map((c) => (
              <Link
                key={c.id}
                to="/dashboard/clientes/$id"
                params={{ id: c.id }}
                className="rounded-full border border-destructive/40 bg-background px-3 py-1 text-xs font-medium hover:bg-destructive/10"
              >
                {c.nome}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          value={fCliente}
          onChange={setFCliente}
          all="todos"
          label="Cliente"
          options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
        />
        <FilterSelect value={fTipo} onChange={setFTipo} all="todos" label="Tipo" options={[...TIPOS_INTERACAO]} />
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="bg-card" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="bg-card" />
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        {filtrados.length === 0 ? (
          <EmptyState
            title="Nenhuma interação registrada"
            description="Registre contatos para nunca perder um cliente na conversa."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Próximo Passo</TableHead>
                    <TableHead>Próximo Contato</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((i) => {
                    const atrasado =
                      !!i.data_proximo_contato && i.data_proximo_contato < hoje;
                    return (
                      <TableRow
                        key={i.id}
                        className={cn(atrasado && "bg-destructive/10")}
                      >
                        <TableCell>
                          <Link
                            to="/dashboard/clientes/$id"
                            params={{ id: i.cliente_id }}
                            className="font-medium hover:text-accent"
                          >
                            {nomeCliente(i.cliente_id)}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(i.data_interacao)}</TableCell>
                        <TableCell>{i.tipo}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {i.descricao}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {i.proximo_passo ?? "—"}
                        </TableCell>
                        <TableCell
                          className={cn(atrasado && "font-semibold text-destructive")}
                        >
                          {formatDate(i.data_proximo_contato)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {i.usuario ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditing(i);
                                setDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <ConfirmDelete
                              onConfirm={() => remove.mutate(i.id)}
                              trigger={
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={filtrados.length} onPage={setPage} />
          </>
        )}
      </Card>

      <InteracaoDialog
        open={dialog}
        onOpenChange={setDialog}
        interacao={editing}
        userEmail={email}
      />
    </div>
  );
}
