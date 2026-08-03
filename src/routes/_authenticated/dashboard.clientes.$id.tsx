import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  KpiCard,
  Loading,
  StatusBadge,
} from "@/components/crm/ui";
import { ClienteDialog } from "@/components/crm/ClienteDialog";
import { ManutencaoDialog } from "@/components/crm/TecnicoManutencaoDialogs";
import {
  GastoDialog,
  InteracaoDialog,
} from "@/components/crm/GastoInteracaoDialogs";
import { formatCurrency, formatDate, num } from "@/lib/crm";
import {
  useClientes,
  useGastos,
  useInteracoes,
  useManutencoes,
  useRemove,
  useTecnicos,
} from "@/hooks/use-crm";

export const Route = createFileRoute("/_authenticated/dashboard/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do Cliente · JANSOL Admin" },
      {
        name: "description",
        content: "Detalhes, manutenções, gastos e interações do cliente.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClienteDetalhe,
});

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: clientes = [], isLoading } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const { data: manutencoes = [] } = useManutencoes();
  const { data: gastos = [] } = useGastos();
  const { data: interacoes = [] } = useInteracoes();
  const removeCliente = useRemove("clientes");
  const removeManutencao = useRemove("manutencoes");
  const removeGasto = useRemove("gastos");
  const removeInteracao = useRemove("interacoes");

  const [editar, setEditar] = useState(false);
  const [novaManut, setNovaManut] = useState(false);
  const [novoGasto, setNovoGasto] = useState(false);
  const [novaInter, setNovaInter] = useState(false);

  if (isLoading) return <Loading />;
  const cliente = clientes.find((c) => c.id === id);
  if (!cliente)
    return (
      <EmptyState
        title="Cliente não encontrado"
        description="Talvez ele tenha sido excluído."
      />
    );

  const tecnico = tecnicos.find((t) => t.id === cliente.tecnico_id);
  const ms = manutencoes.filter((m) => m.cliente_id === id);
  const gs = gastos.filter((g) => g.cliente_id === id);
  const is = interacoes.filter((i) => i.cliente_id === id);

  const totalGastos =
    gs.reduce((s, g) => s + num(g.valor), 0) +
    ms.reduce((s, m) => s + num(m.custo), 0);
  const pago = num(cliente.valor_pago);
  const margem = pago - totalGastos;
  const margemPct = pago > 0 ? (margem / pago) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{cliente.nome}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={cliente.status} />
              <span className="text-sm text-muted-foreground">
                {cliente.cidade ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setEditar(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Pencil className="mr-1.5 h-4 w-4" /> Editar
          </Button>
          <ConfirmDelete
            onConfirm={() =>
              removeCliente.mutate(cliente.id, {
                onSuccess: () => navigate({ to: "/dashboard/clientes" }),
              })
            }
            description={`O cliente "${cliente.nome}" e seus registros vinculados serão excluídos.`}
            trigger={
              <Button variant="destructive">
                <Trash2 className="mr-1.5 h-4 w-4" /> Excluir Cliente
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Info label="Nome" value={cliente.nome} />
            <Info label="Tipo" value={cliente.tipo} />
            <Info label="CPF/CNPJ" value={cliente.cpf_cnpj} />
            <Info
              label="WhatsApp"
              value={
                cliente.whatsapp ? (
                  <a
                    href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    {cliente.whatsapp}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Info label="E-mail" value={cliente.email} />
            <Info label="Origem do Lead" value={cliente.origem_lead} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Info label="Endereço" value={cliente.endereco} />
            <Info label="Cidade" value={cliente.cidade} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sistema</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Info label="Tipo de Sistema" value={cliente.tipo_sistema} />
            <Info label="Telhado" value={cliente.tipo_telhado} />
            <Info label="Pessoas" value={cliente.qtd_pessoas} />
            <Info label="Banheiros" value={cliente.qtd_banheiros} />
            <Info label="Piscina (m²)" value={cliente.tamanho_piscina_m2} />
            <Info label="Marca" value={cliente.marca_equipamento} />
            <Info label="Coletores" value={cliente.qtd_coletores} />
            <Info label="Reservatório" value={cliente.modelo_reservatorio} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instalação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Info label="Data" value={formatDate(cliente.data_instalacao)} />
            <Info label="Técnico" value={tecnico?.nome ?? "—"} />
            <Info label="Status" value={cliente.status} />
            <Info
              label="Valor Orçamento"
              value={formatCurrency(cliente.valor_orcamento)}
            />
            <Info label="Valor Pago" value={formatCurrency(cliente.valor_pago)} />
            <Info
              label="Último Contato"
              value={formatDate(cliente.ultimo_contato)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent className="text-sm whitespace-pre-wrap">
          {cliente.observacoes || "Nenhuma observação registrada."}
        </CardContent>
      </Card>

      <Tabs defaultValue="manutencoes">
        <TabsList>
          <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="interacoes">Interações</TabsTrigger>
          <TabsTrigger value="financeiro">Resumo Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="manutencoes">
          <Card className="overflow-hidden py-0">
            <div className="flex justify-end p-3">
              <Button
                size="sm"
                onClick={() => setNovaManut(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nova Manutenção
              </Button>
            </div>
            {ms.length === 0 ? (
              <EmptyState title="Nenhuma manutenção registrada" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Próxima</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ms.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.data_manutencao)}</TableCell>
                        <TableCell>{m.tipo}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {m.descricao ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={m.status} kind="manutencao" />
                        </TableCell>
                        <TableCell>{formatDate(m.proxima_manutencao)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(m.custo)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ConfirmDelete
                            onConfirm={() => removeManutencao.mutate(m.id)}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="gastos">
          <Card className="overflow-hidden py-0">
            <div className="flex items-center justify-between p-3">
              <p className="text-sm font-medium">
                Total gasto:{" "}
                <span className="text-destructive">
                  {formatCurrency(gs.reduce((s, g) => s + num(g.valor), 0))}
                </span>
              </p>
              <Button
                size="sm"
                onClick={() => setNovoGasto(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Novo Gasto
              </Button>
            </div>
            {gs.length === 0 ? (
              <EmptyState title="Nenhum gasto registrado" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gs.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>{formatDate(g.data)}</TableCell>
                        <TableCell>{g.categoria}</TableCell>
                        <TableCell>{g.descricao}</TableCell>
                        <TableCell>{g.tipo}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(g.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          <ConfirmDelete
                            onConfirm={() => removeGasto.mutate(g.id)}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="interacoes">
          <Card className="py-0">
            <div className="flex justify-end p-3">
              <Button
                size="sm"
                onClick={() => setNovaInter(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nova Interação
              </Button>
            </div>
            {is.length === 0 ? (
              <EmptyState title="Nenhuma interação registrada" />
            ) : (
              <ol className="space-y-3 p-4 pt-0">
                {is.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-md border-l-2 border-accent bg-muted/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {formatDate(i.data_interacao)} · {i.tipo}
                      </p>
                      <ConfirmDelete
                        onConfirm={() => removeInteracao.mutate(i.id)}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                    <p className="text-sm">{i.descricao}</p>
                    {i.proximo_passo && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Próximo passo: {i.proximo_passo}
                        {i.data_proximo_contato
                          ? ` · em ${formatDate(i.data_proximo_contato)}`
                          : ""}
                      </p>
                    )}
                    {i.usuario && (
                      <p className="text-xs text-muted-foreground">
                        por {i.usuario}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Valor Orçado"
              value={formatCurrency(cliente.valor_orcamento)}
            />
            <KpiCard
              label="Valor Pago"
              value={formatCurrency(cliente.valor_pago)}
              tone="success"
            />
            <KpiCard
              label="Total Gasto"
              value={formatCurrency(totalGastos)}
              tone="danger"
              hint="Gastos + manutenções"
            />
            <KpiCard
              label="Margem de Lucro"
              value={formatCurrency(margem)}
              tone={margem >= 0 ? "success" : "danger"}
            />
            <KpiCard
              label="Margem %"
              value={`${margemPct.toFixed(1)}%`}
              tone={margemPct >= 0 ? "success" : "danger"}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ClienteDialog open={editar} onOpenChange={setEditar} cliente={cliente} />
      <ManutencaoDialog
        open={novaManut}
        onOpenChange={setNovaManut}
        clienteId={cliente.id}
      />
      <GastoDialog
        open={novoGasto}
        onOpenChange={setNovoGasto}
        clienteId={cliente.id}
      />
      <InteracaoDialog
        open={novaInter}
        onOpenChange={setNovaInter}
        clienteId={cliente.id}
      />
    </div>
  );
}
