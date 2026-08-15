import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { AgendarVisitaDialog } from "@/components/crm/AgendarVisitaDialog";
import {
  GastoDialog,
  InteracaoDialog,
} from "@/components/crm/GastoInteracaoDialogs";
import { AssistenteCorrecaoDialog } from "@/components/crm/AssistenteCorrecaoDialog";
import { formatCurrency, formatDate, num } from "@/lib/crm";
import { supabase } from "@/integrations/supabase/client";
import {
  useClientes,
  useGastos,
  useInteracoes,
  useManutencoes,
  useRemove,
  useTecnicos,
  useEquipamentos,
  useEquipamentoGarantias,
  useEquipamentoPlanosPreventivos,
  useEquipamentoAnexos,
  useOrdensServico,
  Equipamento,
} from "@/hooks/use-crm";
import { EquipamentoDialog } from "@/components/crm/EquipamentoDialog";
import { EquipamentoDetalhesDialog } from "@/components/crm/EquipamentoDetalhesDialog";

export const Route = createFileRoute("/_authenticated/dashboard/clientes/$id")({
  validateSearch: (search: Record<string, unknown>): { revisao?: boolean } => {
    return {
      revisao: search['revisao'] === true || search['revisao'] === "true",
    };
  },
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
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: clientes = [], isLoading } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const { data: manutencoes = [] } = useManutencoes();
  const { data: gastos = [] } = useGastos();
  const { data: interacoes = [] } = useInteracoes();
  const { data: equipamentos = [], refetch: refetchEquipamentos } = useEquipamentos();
  const { data: garantias = [], refetch: refetchGarantias } = useEquipamentoGarantias();
  const { data: planos = [], refetch: refetchPlanos } = useEquipamentoPlanosPreventivos();
  const { data: anexos = [], refetch: refetchAnexos } = useEquipamentoAnexos();
  const { data: ordensServico = [] } = useOrdensServico();

  const removeCliente = useRemove("clientes");
  const removeManutencao = useRemove("manutencoes");
  const removeGasto = useRemove("gastos");
  const removeInteracao = useRemove("interacoes");

  const [editar, setEditar] = useState(false);
  const [revisao, setRevisao] = useState(search.revisao === true);
  const [agendarVisitaOpen, setAgendarVisitaOpen] = useState(false);
  const [novaManut, setNovaManut] = useState(false);
  const [novoGasto, setNovoGasto] = useState(false);
  const [novaInter, setNovaInter] = useState(false);

  const [novoEquipamentoOpen, setNovoEquipamentoOpen] = useState(false);
  const [equipamentoParaEditar, setEquipamentoParaEditar] = useState<Equipamento | null>(null);
  const [equipamentoDetalhesOpen, setEquipamentoDetalhesOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<Equipamento | null>(null);

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
        <Badge variant={(cliente as any).revisao ? "destructive" : "secondary"}>
          {(cliente as any).revisao ? "Pendente" : "Correto"}
        </Badge>
        <div className="flex gap-2">
          {(cliente as any).revisao && (
            <Button
              onClick={() => setRevisao(true)}
              className="bg-info text-info-foreground hover:bg-info/90"
            >
              Revisar Cadastro (Inconsistência)
            </Button>
          )}
          <Button
            onClick={() => setAgendarVisitaOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CalendarClock className="mr-1.5 h-4 w-4" /> Agendar visita
          </Button>
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
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
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

        <TabsContent value="equipamentos">
          <Card className="overflow-hidden py-0">
            <div className="flex justify-between items-center p-3">
              <p className="text-sm font-medium">
                Equipamentos instalados:{" "}
                <span className="font-bold">{equipamentos.filter((e) => e.cliente_id === cliente.id).length}</span>
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEquipamentoParaEditar(null);
                  setNovoEquipamentoOpen(true);
                }}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Novo Equipamento
              </Button>
            </div>
            {equipamentos.filter((e) => e.cliente_id === cliente.id).length === 0 ? (
              <EmptyState title="Nenhum equipamento cadastrado para este cliente" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Equipamento (Marca / Modelo)</TableHead>
                      <TableHead>Nº de Série</TableHead>
                      <TableHead>Instalação</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipamentos
                      .filter((e) => e.cliente_id === cliente.id)
                      .map((eq) => (
                        <TableRow
                          key={eq.id}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          onClick={() => {
                            setEquipamentoSelecionado(eq);
                            setEquipamentoDetalhesOpen(true);
                          }}
                        >
                          <TableCell className="font-mono text-xs uppercase">{eq.categoria}</TableCell>
                          <TableCell className="font-bold">{eq.marca} {eq.modelo}</TableCell>
                          <TableCell className="font-mono text-xs">{eq.numero_serie || "—"}</TableCell>
                          <TableCell>
                            {eq.data_instalacao
                              ? new Date(eq.data_instalacao + "T00:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {eq.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEquipamentoSelecionado(eq);
                                setEquipamentoDetalhesOpen(true);
                              }}
                            >
                              Ver detalhes
                            </Button>
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
      <EquipamentoDialog
        open={novoEquipamentoOpen}
        onOpenChange={setNovoEquipamentoOpen}
        clientes={clientes}
        ordensServico={ordensServico}
        equipamentosExistentes={equipamentos}
        equipamentoParaEditar={equipamentoParaEditar}
        clienteIdPreDefinido={cliente.id}
        onSave={async (dados) => {
          if (dados.id) {
            await (supabase.from as any)("equipamentos")
              .update({ ...dados, updated_at: new Date().toISOString() })
              .eq("id", dados.id);
          } else {
            await (supabase.from as any)("equipamentos").insert(dados);
          }
          refetchEquipamentos();
        }}
      />
      <EquipamentoDetalhesDialog
        open={equipamentoDetalhesOpen}
        onOpenChange={setEquipamentoDetalhesOpen}
        equipamento={equipamentoSelecionado}
        cliente={cliente}
        garantias={garantias}
        planosPreventivos={planos}
        anexos={anexos}
        ordensServico={ordensServico}
        onRefreshData={() => {
          refetchEquipamentos();
          refetchGarantias();
          refetchPlanos();
          refetchAnexos();
        }}
        onEditarEquipamento={(eq) => {
          setEquipamentoParaEditar(eq);
          setNovoEquipamentoOpen(true);
        }}
      />
      <AssistenteCorrecaoDialog
        open={revisao}
        onOpenChange={(val) => {
          setRevisao(val);
          if (!val && search.revisao) {
            // Remove o parâmetro de query se fechar o dialog
            navigate({ to: "/dashboard/clientes/$id", params: { id: cliente.id } });
          }
        }}
        cliente={cliente}
      />
    </div>
  );
}
