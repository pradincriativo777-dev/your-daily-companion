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
  suggestPrincipalClient,
  type DuplicateConfidence,
  type DuplicateGroup,
} from "@/lib/data-quality";
import { serverExecuteMerge, serverUndoMerge, serverGetMergeHistory } from "@/lib/merge.server";
import { useQuery } from "@tanstack/react-query";
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
  const { data: mergeHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ["merge-history"],
    queryFn: async () => await serverGetMergeHistory()
  });

  const [activeTab, setActiveTab] = useState("duplicidades");
  const [reviewingGroup, setReviewingGroup] = useState<DuplicateGroup | null>(null);

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

  if (reviewingGroup) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assistente de Mesclagem Segura"
          description={`Revisando grupo de duplicidade: ${reviewingGroup.matchDescription}`}
        >
          <Button variant="outline" size="sm" onClick={() => setReviewingGroup(null)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para Qualidade
          </Button>
        </PageHeader>
        <MergeAssistantView group={reviewingGroup} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        title="Central de Qualidade dos Dados"
        description="Diagnóstico e auditoria da base de clientes · Fase 3 (Mesclagem Transacional)"
      >
        <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent-foreground">
          <ShieldCheck className="mr-1 h-3.5 w-3.5 text-accent" /> Modo Seguro Ativo
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
          <span className="font-semibold">Fase 3 — Mesclagem Transacional:</span> O sistema agora permite consolidações definitivas e reversíveis em banco. Todos os diagnósticos em memória continuam ativos para apoiar decisões operacionais.
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
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="duplicidades" className="gap-2">
            <Layers className="h-4 w-4" /> Duplicidades ({analysis.duplicateGroups.length})
          </TabsTrigger>
          <TabsTrigger value="inconsistencias" className="gap-2">
            <AlertCircle className="h-4 w-4" /> Inconsistências ({analysis.clientIssues.length})
          </TabsTrigger>
          <TabsTrigger value="diagnostico" className="gap-2">
            <Database className="h-4 w-4" /> Orientações
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <Sparkles className="h-4 w-4" /> Histórico
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
                <DuplicateGroupCard 
                  key={group.id} 
                  group={group} 
                  onReview={() => setReviewingGroup(group)} 
                />
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

        {/* ========================================================= */}
        {/* ABA 4: HISTÓRICO DE MESCLAGENS                            */}
        {/* ========================================================= */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Operações</CardTitle>
              <CardDescription>Registro auditável das mesclagens e opção de reversão.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Principal (ID)</TableHead>
                    <TableHead>Secundários Afetados</TableHead>
                    <TableHead>Status da Transação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergeHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhuma mesclagem registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mergeHistory.map((audit: any) => {
                      const count = getSecondaryCount(audit);
                      const status = getAuditStatus(audit);

                      return (
                        <TableRow key={audit.id}>
                          <TableCell>
                            <div className="text-xs">{formatDate(audit.created_at)}</div>
                            <div className="font-mono text-[10px] text-muted-foreground mt-0.5" title={audit.operation_id || audit.id}>
                              OP: {(audit.operation_id || audit.id).split('-')[0]}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {audit.principal_id || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {count === null ? (
                              <span className="text-muted-foreground italic">Não disponível</span>
                            ) : (
                              `${count} registro(s)`
                            )}
                          </TableCell>
                          <TableCell>
                            {status === 'SUCCESS' && <Badge variant="outline" className="border-success text-success">Concluída</Badge>}
                            {status === 'REVERTED' && <Badge variant="outline" className="border-warning text-warning">Desfeita</Badge>}
                            {status === 'FAILED' && <Badge variant="outline" className="border-destructive text-destructive">Falhou</Badge>}
                            {status === 'PENDING' && <Badge variant="outline" className="border-info text-info">Processando</Badge>}
                            {status === 'UNKNOWN' && <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Revisão necessária</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            {status === 'SUCCESS' && (
                              <UndoMergeButton 
                                auditId={audit.id} 
                                isReverted={false} 
                                onSuccess={refetchHistory}
                              />
                            )}
                            {status === 'REVERTED' && (
                              <span className="text-xs text-muted-foreground px-2 py-1">Revertida</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UndoMergeButton({ auditId, isReverted, onSuccess }: { auditId: string, isReverted: boolean, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleUndo = async () => {
    if (!window.confirm("Atenção: Isso irá desfazer a mesclagem, restaurando os cadastros secundários e devolvendo os relacionamentos (gastos, interações). Deseja prosseguir?")) return;
    setLoading(true);
    try {
      const res = await serverUndoMerge({ data: { auditId } });
      if (!res.success) {
        alert("Erro ao desfazer: " + res.error);
      } else {
        alert("Mesclagem revertida com sucesso!");
        onSuccess();
      }
    } catch (err: any) {
      alert("Erro crítico: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isReverted) return <span className="text-xs text-muted-foreground">Revertida</span>;
  
  return (
    <Button variant="outline" size="sm" onClick={handleUndo} disabled={loading}>
      {loading ? "Revertendo..." : "Desfazer"}
    </Button>
  );
}

// ==========================================
// FUNÇÕES DE PARSE DO HISTÓRICO
// ==========================================

export function getSecondaryCount(audit: any): number | null {
  if (audit?.archived_ids !== undefined && Array.isArray(audit.archived_ids)) {
    return audit.archived_ids.length;
  }
  if (audit?.campos_anteriores?.secundarios !== undefined && Array.isArray(audit.campos_anteriores.secundarios)) {
    return audit.campos_anteriores.secundarios.length;
  }
  if (typeof audit?.total_afetados === 'number') {
    return audit.total_afetados;
  }
  return null;
}

export function getAuditStatus(audit: any): "SUCCESS" | "REVERTED" | "FAILED" | "PENDING" | "UNKNOWN" {
  // Status legados ou de outras tabelas (como migration_audits)
  if (audit?.status === 'FAILED') return 'FAILED';
  if (audit?.status === 'PENDING') return 'PENDING';
  
  const count = getSecondaryCount(audit);
  
  // Se não alterou ninguém e foi cancelada
  if (count === 0 && !audit?.status) return 'FAILED';
  
  // Revertidas explicitamente ou via timestamp
  if (audit?.reverted_at || audit?.status === 'REVERTED' || audit?.status === 'UNDO_SUCCESS') {
    return 'REVERTED';
  }
  
  // Evidências físicas de sucesso em merge_audits (atômico)
  const hasBackups = audit?.campos_anteriores !== undefined && audit?.campos_anteriores !== null;
  const hasArchivedIds = audit?.archived_ids !== undefined && Array.isArray(audit.archived_ids);
  
  if (audit?.status === 'SUCCESS' || (hasBackups && hasArchivedIds && count !== null && count > 0)) {
    return 'SUCCESS';
  }
  
  return 'UNKNOWN';
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function DuplicateGroupCard({ group, onReview }: { group: DuplicateGroup; onReview: () => void }) {
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {group.clients.length} cadastros vinculados
            </span>
            {group.confidence === "alta" && (
              <Button size="sm" onClick={onReview} className="h-7 px-3 text-xs">
                Revisar grupo
              </Button>
            )}
          </div>
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

function MergeAssistantView({ group }: { group: DuplicateGroup }) {
  const preview = useMemo(() => suggestPrincipalClient(group.clients), [group.clients]);

  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, any>>({});
  const [isMerging, setIsMerging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [mergeResult, setMergeResult] = useState<{ success: boolean; error?: string; auditId?: string } | null>(null);

  // Calcula os valores finais baseados na resolução de conflitos
  const finalData = useMemo(() => {
    const data: Record<string, any> = {};
    for (const item of preview.impactAnalysis) {
      if (item.action === "manter_principal") {
        data[item.field] = item.principalValue;
      } else if (item.action === "adicionar_secundario") {
        data[item.field] = item.suggestedResolution;
      } else if (item.action === "conflito") {
        // Se já escolheu algo, usa, senão mantém o principal
        data[item.field] = resolvedConflicts[item.field] !== undefined ? resolvedConflicts[item.field] : item.principalValue;
      }
    }
    return data;
  }, [preview.impactAnalysis, resolvedConflicts]);

  const allConflictsResolved = preview.impactAnalysis
    .filter(i => i.action === "conflito")
    .every(i => resolvedConflicts[i.field] !== undefined);

  const canMerge = preview.mergeStatus === "Recomendada" && allConflictsResolved;

  const handleMerge = async () => {
    if (confirmText !== "MESCLAR") return;
    setIsMerging(true);
    try {
      const res = await serverExecuteMerge({
        data: {
          principalId: preview.principalClient.id,
          secondaryIds: preview.secondaryClients.map(c => c.id),
          finalData
        }
      });
      setMergeResult(res);
    } catch (e: any) {
      setMergeResult({ success: false, error: e.message });
    } finally {
      setIsMerging(false);
    }
  };

  if (mergeResult) {
    return (
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            {mergeResult.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
            {mergeResult.success ? "Mesclagem Concluída com Sucesso!" : "Falha na Mesclagem"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mergeResult.success ? (
            <>
              <p className="text-sm">
                A operação foi finalizada. Os registros secundários foram arquivados e todos os relacionamentos transferidos.
              </p>
              <div className="text-xs text-muted-foreground">Auditoria ID: {mergeResult.auditId}</div>
              <Link to="/dashboard/clientes/$id" params={{ id: preview.principalClient.id }}>
                <Button>Acessar Cadastro Principal</Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-destructive">{mergeResult.error}</p>
              <Button onClick={() => setMergeResult(null)} variant="outline">Tentar Novamente</Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showConfirm) {
    return (
      <Card className="border-destructive shadow-lg border-2">
        <CardHeader className="bg-destructive/10 pb-4">
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Confirmação de Impacto (Operação Irreversível sem Auditoria)
          </CardTitle>
          <CardDescription>Você está prestes a mesclar os seguintes clientes em uma única transação no banco de dados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded border p-3">
              <span className="font-semibold block mb-1">Cadastro Principal</span>
              {preview.principalClient.nome} <br/>
              {preview.principalClient.cpf_cnpj || "Sem CPF/CNPJ"}
            </div>
            <div className="rounded border p-3">
              <span className="font-semibold block mb-1">Secundários (serão arquivados)</span>
              {preview.secondaryClients.length} registro(s)
            </div>
          </div>
          <div className="text-sm border-l-4 border-warning pl-3 text-muted-foreground">
            Todos os Gastos, Interações e Manutenções atrelados aos secundários serão transferidos automaticamente para o principal.
          </div>
          <div>
            <label className="text-sm font-semibold">Digite MESCLAR para confirmar</label>
            <Input 
              className="mt-1 max-w-sm" 
              placeholder="MESCLAR" 
              value={confirmText} 
              onChange={e => setConfirmText(e.target.value)} 
              disabled={isMerging}
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button variant="destructive" disabled={confirmText !== "MESCLAR" || isMerging} onClick={handleMerge}>
              {isMerging ? "Processando..." : "Confirmar Mesclagem Definitiva"}
            </Button>
            <Button variant="ghost" disabled={isMerging} onClick={() => setShowConfirm(false)}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
        <FileWarning className="h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1">
          <span className="font-semibold">Modo de Análise e Prévia:</span> Esta tela exibe a simulação. Avalie os conflitos abaixo antes de aprovar a mesclagem.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/50 shadow-md">
          <CardHeader className="bg-primary/5 px-4 py-3 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="mb-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Sugestão de Cadastro Principal
                </Badge>
                <CardTitle className="text-base">{preview.principalClient.nome}</CardTitle>
                <CardDescription className="text-xs">
                  Cadastrado em {formatDate(preview.principalClient.created_at)}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-primary">
                  {preview.scores.find((s) => s.clientId === preview.principalClient.id)?.totalScore ?? 0}
                  <span className="text-xs font-normal text-muted-foreground ml-1">pts</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-px bg-border/50 text-sm">
              <div className="bg-background p-3">
                <span className="block text-xs text-muted-foreground">Telefone</span>
                <span className="font-medium">{preview.principalClient.whatsapp || "—"}</span>
              </div>
              <div className="bg-background p-3">
                <span className="block text-xs text-muted-foreground">CPF/CNPJ</span>
                <span className="font-medium">{preview.principalClient.cpf_cnpj || "—"}</span>
              </div>
              <div className="bg-background p-3">
                <span className="block text-xs text-muted-foreground">E-mail</span>
                <span className="font-medium truncate block">{preview.principalClient.email || "—"}</span>
              </div>
              <div className="bg-background p-3">
                <span className="block text-xs text-muted-foreground">Cidade</span>
                <span className="font-medium">{preview.principalClient.cidade || "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análise de Impacto e Resolução de Conflitos */}
        <Card>
          <CardHeader className="px-4 py-3 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Análise de Impacto e Conflitos
            </CardTitle>
            <CardDescription className="text-xs">
              Resolva as divergências entre o principal e os {preview.secondaryClients.length} secundários
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 text-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="h-8">Campo</TableHead>
                  <TableHead className="h-8">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.impactAnalysis.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-2 font-medium">{item.label}</TableCell>
                    <TableCell className="py-2">
                      {item.action === "manter_principal" && (
                        <span className="text-muted-foreground text-xs">Mantém o principal</span>
                      )}
                      {item.action === "adicionar_secundario" && (
                        <div className="text-xs text-accent-foreground font-medium">
                          Incorporar do secundário: {String(item.suggestedResolution)}
                        </div>
                      )}
                      {item.action === "conflito" && (
                        <div className="text-xs font-medium flex flex-col gap-2">
                          <span className="text-warning-foreground">Conflito detectado. Qual valor manter?</span>
                          <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-2 border rounded p-1.5 cursor-pointer hover:bg-muted/50">
                              <input 
                                type="radio" 
                                name={`conflict-${item.field}`} 
                                checked={resolvedConflicts[item.field] === item.principalValue}
                                onChange={() => setResolvedConflicts(prev => ({...prev, [item.field]: item.principalValue}))}
                              />
                              <span className="truncate max-w-[200px]" title={String(item.principalValue)}>{String(item.principalValue)} (Principal)</span>
                            </label>
                            {item.secondaryValues.map((sv, i) => (
                              <label key={i} className="flex items-center gap-2 border rounded p-1.5 cursor-pointer hover:bg-muted/50">
                                <input 
                                  type="radio" 
                                  name={`conflict-${item.field}`} 
                                  checked={resolvedConflicts[item.field] === sv.value}
                                  onChange={() => setResolvedConflicts(prev => ({...prev, [item.field]: sv.value}))}
                                />
                                <span className="truncate max-w-[200px]" title={String(sv.value)}>{String(sv.value)} (Secundário)</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Bloqueio e Botão de Ação */}
      <div className="mt-6">
        {preview.blockingIssues.length > 0 && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <h4 className="font-semibold flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4"/> Mesclagem Bloqueada</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {preview.blockingIssues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
          <div>
            <div className="font-semibold text-sm">Status: {preview.mergeStatus}</div>
            <div className="text-xs text-muted-foreground">
              {preview.mergeStatus === "Não mesclar" 
                ? "Existem impeditivos graves. Resolva-os antes de prosseguir."
                : preview.mergeStatus === "Revisão manual"
                  ? "Resolva os conflitos na tabela acima para liberar a mesclagem."
                  : "Nenhum conflito. Mesclagem pronta para execução."}
            </div>
          </div>
          <Button 
            disabled={!canMerge} 
            onClick={() => setShowConfirm(true)}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4"/> Aprovar e Iniciar Mesclagem
          </Button>
        </div>
      </div>
    </div>
  );
}
