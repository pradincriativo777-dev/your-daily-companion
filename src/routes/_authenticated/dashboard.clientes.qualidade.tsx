import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  FileQuestion,
  FileWarning,
  Filter,
  HelpCircle,
  Layers,
  MapPinOff,
  PhoneOff,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useClientes } from "@/hooks/use-crm";
import {
  analyzeClientDatabase,
  type DuplicateConfidence,
  type DuplicateGroup,
  type IssueType,
} from "@/lib/data-quality";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EmptyState, KpiCard, Loading, PageHeader, Pagination, StatusBadge } from "@/components/crm/ui";
import { formatDate } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/dashboard/clientes/qualidade")({
  head: () => ({
    meta: [
      { title: "Qualidade dos Dados · JANSOL Admin" },
      {
        name: "description",
        content: "Diagnóstico e auditoria de qualidade da base de clientes da JANSOL.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DataQualityPage,
});

const DUP_PAGE_SIZE = 10;
const ISSUES_PAGE_SIZE = 25;

function DataQualityPage() {
  const { data: clientes = [], isLoading } = useClientes();

  const [activeTab, setActiveTab] = useState("duplicidades");

  // Filtros de Duplicidades
  const [dupSearch, setDupSearch] = useState("");
  const [dupConfidence, setDupConfidence] = useState<"todas" | DuplicateConfidence>("todas");
  const [dupPage, setDupPage] = useState(1);

  // Filtros de Inconsistências
  const [issueSearch, setIssueSearch] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("todos");
  const [issueCategoryFilter, setIssueCategoryFilter] = useState<string>("todos");
  const [issuesPage, setIssuesPage] = useState(1);

  // Motor de análise executado exclusivamente em memória (read-only)
  const analysis = useMemo(() => {
    return analyzeClientDatabase(clientes);
  }, [clientes]);

  // Duplicidades filtradas
  const filteredDuplicates = useMemo(() => {
    const q = dupSearch.trim().toLowerCase();
    return analysis.duplicateGroups.filter((group) => {
      const matchConf = dupConfidence === "todas" || group.confidence === dupConfidence;
      if (!matchConf) return false;

      if (!q) return true;
      return (
        group.matchDescription.toLowerCase().includes(q) ||
        group.matchedValue.toLowerCase().includes(q) ||
        group.clients.some(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.whatsapp ?? "").includes(q) ||
            (c.cpf_cnpj ?? "").includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            (c.cidade ?? "").toLowerCase().includes(q),
        )
      );
    });
  }, [analysis.duplicateGroups, dupSearch, dupConfidence]);

  const pagedDuplicates = useMemo(() => {
    const start = (dupPage - 1) * DUP_PAGE_SIZE;
    return filteredDuplicates.slice(start, start + DUP_PAGE_SIZE);
  }, [filteredDuplicates, dupPage]);

  // Inconsistências filtradas
  const filteredIssues = useMemo(() => {
    const q = issueSearch.trim().toLowerCase();
    return analysis.clientIssues.filter((issue) => {
      const matchType = issueTypeFilter === "todos" || issue.issueType === issueTypeFilter;
      const matchCat = issueCategoryFilter === "todos" || issue.category === issueCategoryFilter;
      if (!matchType || !matchCat) return false;

      if (!q) return true;
      return (
        issue.client.nome.toLowerCase().includes(q) ||
        issue.title.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        (issue.client.whatsapp ?? "").includes(q) ||
        (issue.client.cpf_cnpj ?? "").includes(q) ||
        (issue.client.cidade ?? "").toLowerCase().includes(q)
      );
    });
  }, [analysis.clientIssues, issueSearch, issueTypeFilter, issueCategoryFilter]);

  const pagedIssues = useMemo(() => {
    const start = (issuesPage - 1) * ISSUES_PAGE_SIZE;
    return filteredIssues.slice(start, start + ISSUES_PAGE_SIZE);
  }, [filteredIssues, issuesPage]);

  if (isLoading) return <Loading label="Auditando base de clientes..." />;

  const healthScore = analysis.healthScore;
  const scoreColor =
    healthScore >= 80 ? "text-success" : healthScore >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        title="Central de Qualidade dos Dados"
        description="Diagnóstico e auditoria da base de clientes · Fase 1 (Modo Somente Análise)"
      >
        <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent-foreground">
          <ShieldCheck className="mr-1 h-3.5 w-3.5 text-accent" /> Modo Leitura Ativo
        </Badge>
        <Link to="/dashboard/clientes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para Clientes
          </Button>
        </Link>
      </PageHeader>

      {/* Alerta de Garantia de Integridade */}
      <div className="flex items-center gap-3 rounded-lg border border-info/40 bg-info/10 px-4 py-3 text-sm text-info-foreground">
        <Sparkles className="h-5 w-5 shrink-0 text-info" />
        <div className="flex-1">
          <span className="font-semibold">Fase 1 — Diagnóstico Seguro:</span> Nenhum cliente foi
          alterado, mesclado ou excluído. Os dados exibidos abaixo são calculados dinamicamente em
          memória para apoiar decisões operacionais.
        </div>
      </div>

      {/* Grade de KPIs / Resumo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Saúde da Base
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${scoreColor}`}>{healthScore}%</span>
              <span className="text-xs text-muted-foreground">índice de integridade</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {analysis.totalClientes} clientes auditados
            </p>
          </CardContent>
        </Card>

        <KpiCard
          label="Duplicidades Exatas"
          value={analysis.summary.duplicidadesExatas}
          tone={analysis.summary.duplicidadesExatas > 0 ? "danger" : "success"}
          hint="CPF, telefone ou e-mail igual"
        />
        <KpiCard
          label="Possíveis Duplicidades"
          value={analysis.summary.possiveisDuplicidades}
          tone={analysis.summary.possiveisDuplicidades > 0 ? "warning" : "default"}
          hint="Nome + cidade idênticos"
        />
        <KpiCard
          label="Telefones Inválidos"
          value={analysis.summary.telefonesInvalidos}
          tone={analysis.summary.telefonesInvalidos > 0 ? "warning" : "default"}
          hint="Fora do padrão brasileiro"
        />
        <KpiCard
          label="CPF/CNPJ com Problemas"
          value={analysis.summary.cpfCnpjInvalidos + analysis.summary.cpfCnpjComData}
          tone={
            analysis.summary.cpfCnpjInvalidos + analysis.summary.cpfCnpjComData > 0
              ? "danger"
              : "default"
          }
          hint={
            analysis.summary.cpfCnpjComData > 0
              ? `${analysis.summary.cpfCnpjComData} com datas no campo`
              : "Dígitos incorretos"
          }
        />
        <KpiCard
          label="Nomes Suspeitos"
          value={analysis.summary.nomesSuspeitos}
          tone={analysis.summary.nomesSuspeitos > 0 ? "warning" : "default"}
          hint="Endereços ou anotações no nome"
        />
        <KpiCard
          label="Textos Corrompidos"
          value={analysis.summary.textosCorrompidos}
          tone={analysis.summary.textosCorrompidos > 0 ? "warning" : "default"}
          hint="Erros de codificação (mojibake)"
        />
        <KpiCard
          label="Campos Muito Vazios"
          value={analysis.summary.muitosCamposVazios}
          tone="pending"
          hint="5 ou mais campos em branco"
        />
        <KpiCard
          label="Sem Cidade"
          value={analysis.summary.semCidade}
          tone="pending"
          hint="Prejudica logística"
        />
        <KpiCard
          label="Sem Origem do Lead"
          value={analysis.summary.semOrigem}
          hint="Origem em branco ou 'Outro'"
        />
      </div>

      {/* Abas Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="duplicidades" className="gap-2">
            <Layers className="h-4 w-4" /> Duplicidades ({analysis.duplicateGroups.length})
          </TabsTrigger>
          <TabsTrigger value="inconsistencias" className="gap-2">
            <AlertCircle className="h-4 w-4" /> Inconsistências ({analysis.clientIssues.length})
          </TabsTrigger>
          <TabsTrigger value="diagnostico" className="gap-2">
            <Database className="h-4 w-4" /> Orientações
          </TabsTrigger>
        </TabsList>

        {/* ========================================================= */}
        {/* ABA 1: DUPLICIDADES                                       */}
        {/* ========================================================= */}
        <TabsContent value="duplicidades" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={dupSearch}
                  onChange={(e) => {
                    setDupSearch(e.target.value);
                    setDupPage(1);
                  }}
                  placeholder="Buscar por nome, telefone, CPF, e-mail..."
                  className="pl-8"
                />
              </div>
              <Select
                value={dupConfidence}
                onValueChange={(v) => {
                  setDupConfidence(v as "todas" | DuplicateConfidence);
                  setDupPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Nível de Confiança" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Confianças</SelectItem>
                  <SelectItem value="alta">Alta Confiança (Exata)</SelectItem>
                  <SelectItem value="media">Média Confiança (Nome+Cidade)</SelectItem>
                  <SelectItem value="baixa">Baixa Confiança (Sugestão)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredDuplicates.length} grupo(s) de duplicidade encontrado(s)
            </span>
          </div>

          {filteredDuplicates.length === 0 ? (
            <EmptyState
              title="Nenhuma duplicidade encontrada"
              description="Nenhum registro atende aos filtros de duplicidade selecionados."
            />
          ) : (
            <div className="space-y-4">
              {pagedDuplicates.map((group) => (
                <DuplicateGroupCard key={group.id} group={group} />
              ))}

              <Pagination
                page={dupPage}
                pageCount={Math.ceil(filteredDuplicates.length / DUP_PAGE_SIZE)}
                total={filteredDuplicates.length}
                onPage={setDupPage}
              />
            </div>
          )}
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 2: INCONSISTÊNCIAS CADASTRAIS                        */}
        {/* ========================================================= */}
        <TabsContent value="inconsistencias" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={issueSearch}
                  onChange={(e) => {
                    setIssueSearch(e.target.value);
                    setIssuesPage(1);
                  }}
                  placeholder="Buscar por cliente, telefone, cidade..."
                  className="pl-8"
                />
              </div>

              <Select
                value={issueTypeFilter}
                onValueChange={(v) => {
                  setIssueTypeFilter(v);
                  setIssuesPage(1);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Tipo de Problema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Problemas</SelectItem>
                  <SelectItem value="telefone_invalido">Telefones Inválidos</SelectItem>
                  <SelectItem value="telefone_ausente">Telefones Ausentes</SelectItem>
                  <SelectItem value="cpf_cnpj_invalido">CPF/CNPJ Inválido</SelectItem>
                  <SelectItem value="cpf_cnpj_data">Data no campo CPF/CNPJ</SelectItem>
                  <SelectItem value="nome_suspeito">Nomes Suspeitos</SelectItem>
                  <SelectItem value="texto_corrompido">Textos Corrompidos</SelectItem>
                  <SelectItem value="muitos_campos_vazios">Campos Muito Vazios</SelectItem>
                  <SelectItem value="sem_cidade">Sem Cidade</SelectItem>
                  <SelectItem value="sem_origem">Sem Origem do Lead</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={issueCategoryFilter}
                onValueChange={(v) => {
                  setIssueCategoryFilter(v);
                  setIssuesPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Severidades</SelectItem>
                  <SelectItem value="Critico">Crítico</SelectItem>
                  <SelectItem value="Alerta">Alerta</SelectItem>
                  <SelectItem value="Informativo">Informativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs text-muted-foreground">
              {filteredIssues.length} inconsistência(s) encontrada(s)
            </span>
          </div>

          {filteredIssues.length === 0 ? (
            <EmptyState
              title="Nenhuma inconsistência encontrada"
              description="Nenhum registro corresponde aos filtros selecionados."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Problema Detectado</TableHead>
                      <TableHead>Campo Afetado</TableHead>
                      <TableHead>Valor Atual no Banco</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedIssues.map((issue, idx) => (
                      <TableRow key={`${issue.clientId}-${issue.issueType}-${idx}`}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {issue.client.nome || "(Sem nome)"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {issue.client.cidade || "Sem cidade"} · {issue.client.tipo_sistema}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{issue.title}</div>
                          <div className="text-xs text-muted-foreground">{issue.description}</div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {issue.affectedField}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="max-w-[200px] truncate block font-mono text-xs text-muted-foreground">
                            {issue.currentValue}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SeverityBadge category={issue.category} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {issue.client.origem_lead || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            to="/dashboard/clientes/$id"
                            params={{ id: issue.clientId }}
                            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-xs hover:bg-muted"
                          >
                            Ver cliente <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>

              <Pagination
                page={issuesPage}
                pageCount={Math.ceil(filteredIssues.length / ISSUES_PAGE_SIZE)}
                total={filteredIssues.length}
                onPage={setIssuesPage}
              />
            </Card>
          )}
        </TabsContent>

        {/* ========================================================= */}
        {/* ABA 3: DIAGNÓSTICO & ORIENTAÇÕES                          */}
        {/* ========================================================= */}
        <TabsContent value="diagnostico" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Critérios de Detecção de
                  Duplicidades
                </CardTitle>
                <CardDescription>
                  Como a Central de Qualidade classifica as duplicidades na base
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Badge className="bg-destructive text-destructive-foreground">Alta Confiança</Badge>
                    <span>CPF/CNPJ, Telefone ou E-mail Idêntico</span>
                  </div>
                  <p className="mt-1 text-xs">
                    Dois cadastros compartilham exatamente o mesmo identificador único após
                    normalização de pontuações e formatos. Altíssima probabilidade de ser o mesmo
                    cliente cadastrado duas vezes.
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Badge className="bg-warning text-warning-foreground">Média Confiança</Badge>
                    <span>Nome e Cidade Idênticos</span>
                  </div>
                  <p className="mt-1 text-xs">
                    Cadastros com nomes completos idênticos na mesma cidade, porém com telefones ou
                    e-mails diferentes/ausentes. Pode representar a mesma pessoa ou homônimos.
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Badge variant="outline">Baixa Confiança</Badge>
                    <span>Nomes Parecidos (Apenas Sugestão)</span>
                  </div>
                  <p className="mt-1 text-xs">
                    Similaridade fonética ou tipográfica elevada (ex: erros de digitação de sobrenomes).
                    <strong> Nunca é classificado como duplicidade definitiva.</strong>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Principais Inconsistências
                  Mapeadas
                </CardTitle>
                <CardDescription>
                  Erros frequentes herdados de migrações ou digitação rápida
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-md border p-3">
                  <div className="font-medium text-foreground">Datas inseridas no campo CPF/CNPJ</div>
                  <p className="mt-1 text-xs">
                    Identificamos registros onde datas de instalação ou nascimento foram digitadas
                    no campo de documento.
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <div className="font-medium text-foreground">Nomes com Endereços ou Status</div>
                  <p className="mt-1 text-xs">
                    Registros onde o campo 'Nome' foi preenchido com 'Rua...', 'Condomínio...' ou
                    status como 'Status: Orçamento'.
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <div className="font-medium text-foreground">Caracteres Corrompidos (Mojibake)</div>
                  <p className="mt-1 text-xs">
                    Textos com falha de decodificação UTF-8 herdados de planilhas antigas (ex:
                    Ã¡, Ã©, Ã§, ).
                  </p>
                </div>

                <div className="rounded-md border p-3">
                  <div className="font-medium text-foreground">Telefones fora do padrão</div>
                  <p className="mt-1 text-xs">
                    Celulares com menos de 11 dígitos, DDDs inexistentes ou números compostos por
                    dígitos repetidos como 000000000.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  const confBadge = {
    alta: <Badge className="bg-destructive text-destructive-foreground">Alta Confiança</Badge>,
    media: <Badge className="bg-warning text-warning-foreground">Média Confiança</Badge>,
    baixa: <Badge variant="outline">Sugestão (Baixa Confiança)</Badge>,
  }[group.confidence];

  return (
    <Card className="overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {confBadge}
            <span className="font-semibold text-sm text-foreground">
              {group.matchDescription}:
            </span>
            <code className="rounded bg-background px-2 py-0.5 font-mono text-xs font-semibold text-accent-foreground border border-border">
              {group.matchedValue}
            </code>
          </div>
          <span className="text-xs text-muted-foreground">
            {group.clients.length} cadastros vinculados
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
          {group.clients.map((client, idx) => (
            <div key={client.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{client.nome}</span>
                    <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cadastrado em {formatDate(client.created_at)} · Status:{" "}
                    <StatusBadge status={client.status} />
                  </div>
                </div>
                <Link
                  to="/dashboard/clientes/$id"
                  params={{ id: client.id }}
                  className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground shadow-xs hover:bg-accent/90"
                >
                  Ver cliente <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">WhatsApp / Telefone:</span>
                  <span className="font-medium">{client.whatsapp || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">CPF / CNPJ:</span>
                  <span className="font-medium">{client.cpf_cnpj || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Cidade:</span>
                  <span className="font-medium">{client.cidade || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">E-mail:</span>
                  <span className="font-medium truncate block">{client.email || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Sistema:</span>
                  <span className="font-medium">{client.tipo_sistema}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Origem do Lead:</span>
                  <span className="font-medium">{client.origem_lead || "—"}</span>
                </div>
              </div>

              {client.endereco && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  <span>Endereço: </span>
                  <span className="text-foreground">{client.endereco}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ category }: { category: "Critico" | "Alerta" | "Informativo" }) {
  if (category === "Critico") {
    return (
      <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive text-xs">
        Crítico
      </Badge>
    );
  }
  if (category === "Alerta") {
    return (
      <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning text-xs">
        Alerta
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs">
      Informativo
    </Badge>
  );
}
