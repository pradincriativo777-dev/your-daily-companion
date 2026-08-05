import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Eye, MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  SortHeader,
  StatusBadge,
} from "@/components/crm/ui";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { InteracaoDialog } from "@/components/crm/GastoInteracaoDialogs";
import {
  MARCAS,
  ORIGENS_LEAD,
  STATUS_CLIENTE,
  TIPOS_SISTEMA,
  exportCSV,
  formatCurrency,
  formatDate,
} from "@/lib/crm";
import { useClientes, useRemove, useTecnicos, type Cliente } from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes · JANSOL Admin" },
      {
        name: "description",
        content: "Cadastro e gestão de clientes de aquecimento solar da JANSOL.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientesPage,
});

const PAGE_SIZE = 25;

function ClientesPage() {
  const { data: clientes = [], isLoading } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const remove = useRemove("clientes");

  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [fCidade, setFCidade] = useState("todas");
  const [fSistema, setFSistema] = useState("todos");
  const [fMarca, setFMarca] = useState("todas");
  const [fTecnico, setFTecnico] = useState("todos");
  const [fOrigem, setFOrigem] = useState("todas");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ field: string; dir: "asc" | "desc" }>({
    field: "nome",
    dir: "asc",
  });
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [interacaoFor, setInteracaoFor] = useState<string | null>(null);

  const cidades = Array.from(
    new Set(clientes.map((c) => c.cidade).filter(Boolean) as string[]),
  ).sort();

  const nomeTecnico = (id: string | null) =>
    tecnicos.find((t) => t.id === id)?.nome ?? "—";

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const list = clientes.filter(
      (c) =>
        (!q ||
          c.nome.toLowerCase().includes(q) ||
          (c.cidade ?? "").toLowerCase().includes(q) ||
          (c.whatsapp ?? "").toLowerCase().includes(q) ||
          (c.cpf_cnpj ?? "").toLowerCase().includes(q)) &&
        (fStatus === "todos" || c.status === fStatus) &&
        (fCidade === "todas" || c.cidade === fCidade) &&
        (fSistema === "todos" || c.tipo_sistema === fSistema) &&
        (fMarca === "todas" || c.marca_equipamento === fMarca) &&
        (fTecnico === "todos" || c.tecnico_id === fTecnico) &&
        (fOrigem === "todas" || c.origem_lead === fOrigem),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.field];
      const bv = (b as unknown as Record<string, unknown>)[sort.field];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "pt-BR") * dir;
    });
  }, [clientes, busca, fStatus, fCidade, fSistema, fMarca, fTecnico, fOrigem, sort]);

  const pageCount = Math.ceil(filtrados.length / PAGE_SIZE);
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onSort = (field: string) => {
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" },
    );
  };

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageHeader title="Clientes" description={`${filtrados.length} cliente(s) listado(s)`}>
        <Button
          variant="outline"
          onClick={() =>
            exportCSV(
              "clientes.csv",
              filtrados.map((c) => ({
                Nome: c.nome,
                Tipo: c.tipo,
                "CPF/CNPJ": c.cpf_cnpj ?? "",
                WhatsApp: c.whatsapp ?? "",
                Email: c.email ?? "",
                Endereco: c.endereco ?? "",
                Cidade: c.cidade ?? "",
                Sistema: c.tipo_sistema,
                Marca: c.marca_equipamento ?? "",
                "Data Instalacao": formatDate(c.data_instalacao),
                Tecnico: nomeTecnico(c.tecnico_id),
                "Valor Orcamento": c.valor_orcamento ?? 0,
                "Valor Pago": c.valor_pago ?? 0,
                Status: c.status,
                "Ultimo Contato": formatDate(c.ultimo_contato),
              })),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            exportCSV(
              "todos-clientes.csv",
              clientes.map((c) => ({
                Nome: c.nome,
                Tipo: c.tipo,
                "CPF/CNPJ": c.cpf_cnpj ?? "",
                WhatsApp: c.whatsapp ?? "",
                Email: c.email ?? "",
                Endereco: c.endereco ?? "",
                Cidade: c.cidade ?? "",
                Sistema: c.tipo_sistema,
                Marca: c.marca_equipamento ?? "",
                "Data Instalacao": formatDate(c.data_instalacao),
                Tecnico: nomeTecnico(c.tecnico_id),
                "Valor Orcamento": c.valor_orcamento ?? 0,
                "Valor Pago": c.valor_pago ?? 0,
                Status: c.status,
                Origem: c.origem_lead ?? "",
                "Ultimo Contato": formatDate(c.ultimo_contato),
                Observacoes: c.observacoes ?? "",
              })),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Exportar Clientes
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Novo Cliente
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome, cidade, telefone, CPF/CNPJ"
          className="bg-card lg:col-span-2"
        />
        <FilterSelect value={fStatus} onChange={setFStatus} all="todos" label="Status" options={[...STATUS_CLIENTE]} />
        <FilterSelect value={fCidade} onChange={setFCidade} all="todas" label="Cidade" options={cidades} />
        <FilterSelect value={fSistema} onChange={setFSistema} all="todos" label="Sistema" options={[...TIPOS_SISTEMA]} />
        <FilterSelect value={fMarca} onChange={setFMarca} all="todas" label="Marca" options={[...MARCAS]} />
        <FilterSelect
          value={fTecnico}
          onChange={setFTecnico}
          all="todos"
          label="Técnico"
          options={tecnicos.map((t) => ({ value: t.id, label: t.nome }))}
        />
        <FilterSelect value={fOrigem} onChange={setFOrigem} all="todas" label="Origem" options={[...ORIGENS_LEAD]} />
      </div>

      <Card className="overflow-hidden py-0">
        {filtrados.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Ajuste os filtros ou cadastre um novo cliente."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortHeader label="Nome" field="nome" sort={sort} onSort={onSort} /></TableHead>
                    <TableHead><SortHeader label="Cidade" field="cidade" sort={sort} onSort={onSort} /></TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead><SortHeader label="Instalação" field="data_instalacao" sort={sort} onSort={onSort} /></TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="text-right"><SortHeader label="Orçamento" field="valor_orcamento" sort={sort} onSort={onSort} className="ml-auto" /></TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead><SortHeader label="Status" field="status" sort={sort} onSort={onSort} /></TableHead>
                    <TableHead><SortHeader label="Últ. Contato" field="ultimo_contato" sort={sort} onSort={onSort} /></TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          to="/dashboard/clientes/$id"
                          params={{ id: c.id }}
                          className="font-medium hover:text-accent"
                        >
                          {c.nome}
                        </Link>
                      </TableCell>
                      <TableCell>{c.cidade ?? "—"}</TableCell>
                      <TableCell>
                        {c.whatsapp ? (
                          <a
                            href={`https://wa.me/55${c.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline"
                          >
                            {c.whatsapp}
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{c.tipo_sistema}</TableCell>
                      <TableCell>{c.marca_equipamento ?? "—"}</TableCell>
                      <TableCell>{formatDate(c.data_instalacao)}</TableCell>
                      <TableCell>{nomeTecnico(c.tecnico_id)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.valor_orcamento)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.valor_pago)}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell>{formatDate(c.ultimo_contato)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" title="Ver">
                            <Link to="/dashboard/clientes/$id" params={{ id: c.id }}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Nova interação"
                            onClick={() => setInteracaoFor(c.id)}
                          >
                            <MessageSquarePlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => {
                              setEditing(c);
                              setDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDelete
                            onConfirm={() => remove.mutate(c.id)}
                            description={`O cliente "${c.nome}" e todos os seus registros vinculados serão excluídos.`}
                            trigger={
                              <Button variant="ghost" size="icon" title="Excluir">
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
            <Pagination page={page} pageCount={pageCount} total={filtrados.length} onPage={setPage} />
          </>
        )}
      </Card>

      <ClienteDialog open={dialog} onOpenChange={setDialog} cliente={editing} />
      <InteracaoDialog
        open={!!interacaoFor}
        onOpenChange={(v) => !v && setInteracaoFor(null)}
        clienteId={interacaoFor ?? undefined}
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  all,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  label: string;
  options: ReadonlyArray<string | { value: string; label: string }>;
}) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-card">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={all}>{label}: todos</SelectItem>
        {opts.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
