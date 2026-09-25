import { useRef, useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Upload, AlertTriangle, FileWarning, ArrowRight, ShieldCheck, X } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusBadge } from "@/components/crm/ui";
import { useClientes } from "@/hooks/use-crm";
import { serverExecuteBatchImport } from "@/lib/batch.server";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/dashboard/importar-clientes")({
  head: () => ({
    meta: [
      { title: "Importar Clientes Segura · JANSOL Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImportAssistant,
});

type RowClassification = "Novo" | "AtualizacaoSegura" | "SemAlteracoes" | "Conflito" | "Duplicidade" | "Invalida";

interface ProcessedRow {
  index: number;
  raw: any;
  classification: RowClassification;
  reasons: string[];
  safeUpdates: Record<string, string>;
  conflicts: Record<string, { old: string; new: string }>;
  mappedData: any;
  matchedId: string | null;
  selected: boolean;
}

function normalizeStr(str: any) {
  if (!str) return "";
  return String(str).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeDoc(str: any) {
  if (!str) return "";
  return String(str).replace(/\D/g, "");
}

function ImportAssistant() {
  const qc = useQueryClient();
  const { data: dbClientes = [] } = useClientes();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ProcessedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", raw: false });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets["Clientes"] || (sheetName ? wb.Sheets[sheetName] : null); // Prefere a aba Clientes
      if (!sheet) throw new Error("Aba 'Clientes' ou planilha vazia.");
      
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      
      setFileName(file.name);
      classifyRows(rawRows);
      
    } catch (err: any) {
      toast.error(`Falha ao ler arquivo: ${err.message}`);
    }
  };

  const classifyRows = (rawRows: any[]) => {
    const newRows: ProcessedRow[] = [];

    rawRows.forEach((row, idx) => {
      const idTecnico = row["ID Técnico (Não Alterar)"]?.trim();
      const nome = row["Nome"]?.trim();
      const doc = normalizeDoc(row["CPF/CNPJ"]);
      const whatsapp = normalizeDoc(row["WhatsApp"]);
      const email = normalizeStr(row["E-mail"]);

      let classification: RowClassification = "Novo";
      let reasons: string[] = [];
      let matchedClient: any = null;
      let matchedId: string | null = null;
      let safeUpdates: Record<string, string> = {};
      let conflicts: Record<string, { old: string; new: string }> = {};

      if (!nome) {
        classification = "Invalida";
        reasons.push("Nome é obrigatório.");
      } else {
        // Find match
        if (idTecnico) {
          matchedClient = dbClientes.find(c => c.id === idTecnico);
          if (matchedClient) matchedId = matchedClient.id;
        } else {
          // Heuristic match
          const possibleMatches = dbClientes.filter(c => {
            const docMatch = doc && normalizeDoc(c.cpf_cnpj) === doc;
            const wppMatch = whatsapp && normalizeDoc(c.whatsapp) === whatsapp;
            const emailMatch = email && normalizeStr(c.email) === email;
            return docMatch || wppMatch || emailMatch;
          });

          if (possibleMatches.length === 1) {
            matchedClient = possibleMatches[0];
            matchedId = matchedClient.id;
          } else if (possibleMatches.length > 1) {
            classification = "Duplicidade";
            reasons.push("Múltiplos clientes encontrados com estes dados de contato/documento.");
          }
        }

        if (matchedClient && classification !== "Duplicidade") {
          // Compare fields
          const fieldsToCompare = [
            { key: "nome", col: "Nome" },
            { key: "cpf_cnpj", col: "CPF/CNPJ" },
            { key: "whatsapp", col: "WhatsApp" },
            { key: "email", col: "E-mail" },
            { key: "endereco", col: "Endereço" },
            { key: "cidade", col: "Cidade" },
            { key: "tipo_sistema", col: "Sistema" },
            { key: "origem_lead", col: "Origem Lead" },
            { key: "status", col: "Status" },
            { key: "observacoes", col: "Observações" }
          ];

          fieldsToCompare.forEach(({ key, col }) => {
            const rawVal = row[col];
            if (rawVal === undefined || rawVal === "") return; // Pula vazios do Excel

            const oldVal = matchedClient[key] || "";
            const newVal = String(rawVal).trim();

            if (oldVal && newVal && normalizeStr(oldVal) !== normalizeStr(newVal)) {
              conflicts[key] = { old: String(oldVal), new: newVal };
            } else if (normalizeStr(oldVal) !== normalizeStr(newVal)) {
              safeUpdates[key] = newVal;
            }
          });

          if (Object.keys(conflicts).length > 0) {
            classification = "Conflito";
            reasons.push("Tentativa de sobrescrever dados preenchidos com valores diferentes.");
          } else if (Object.keys(safeUpdates).length > 0) {
            classification = "AtualizacaoSegura";
          } else {
            classification = "SemAlteracoes";
          }
        }
      }

      const mappedData = {
        nome,
        tipo: row["Tipo Pessoa"]?.trim() || "Física",
        cpf_cnpj: row["CPF/CNPJ"]?.trim(),
        whatsapp: row["WhatsApp"]?.trim(),
        email: row["E-mail"]?.trim(),
        endereco: row["Endereço"]?.trim(),
        cidade: row["Cidade"]?.trim(),
        tipo_sistema: row["Sistema"]?.trim(),
        origem_lead: row["Origem Lead"]?.trim(),
        status: row["Status"]?.trim(),
        observacoes: row["Observações"]?.trim()
      };

      // Limpa chaves undefined do mappedData
      Object.keys(mappedData).forEach(key => {
        if ((mappedData as any)[key] === undefined) delete (mappedData as any)[key];
      });

      newRows.push({
        index: idx + 2, // Excel rows start at 1, +1 for header
        raw: row,
        classification,
        reasons,
        safeUpdates,
        conflicts,
        mappedData,
        matchedId,
        selected: classification === "Novo" || classification === "AtualizacaoSegura"
      });
    });

    setRows(newRows);
  };

  const handleExecute = async () => {
    setImporting(true);
    setProgress(20);

    const operationId = crypto.randomUUID();
    const novosClientes = rows.filter(r => r.selected && r.classification === "Novo").map(r => r.mappedData);
    const atualizacoes = rows.filter(r => r.selected && r.classification === "AtualizacaoSegura").map(r => ({
      id: r.matchedId,
      ...r.safeUpdates
    }));

    if (novosClientes.length === 0 && atualizacoes.length === 0) {
      toast.info("Nenhum cliente marcado para importar/atualizar.");
      setImporting(false);
      setProgress(0);
      return;
    }

    setProgress(50);

    const res = await serverExecuteBatchImport({
      data: {
        operationId,
        novosClientes,
        atualizacoes
      }
    });

    if (res.success) {
      toast.success("Lote importado e auditado com sucesso!");
      await qc.invalidateQueries({ queryKey: ["clientes"] });
      setProgress(100);
      
      // Cleanup
      setTimeout(() => {
        setRows([]);
        setFileName("");
        setProgress(0);
      }, 2000);
    } else {
      toast.error("Erro na transação de importação: " + res.error);
      setProgress(0);
    }
    
    setImporting(false);
  };

  const toggleSelect = (index: number) => {
    setRows(prev => prev.map(r => {
      if (r.index === index && (r.classification === "Novo" || r.classification === "AtualizacaoSegura")) {
        return { ...r, selected: !r.selected };
      }
      return r;
    }));
  };

  const counts = useMemo(() => {
    return rows.reduce((acc, row) => {
      acc[row.classification] = (acc[row.classification] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistente de Importação Segura"
        description="Dry-run inteligente para proteger os dados atuais contra sobrescritas acidentais."
      >
        <Button
          onClick={() => inputRef.current?.click()}
          className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
        >
          <FileUp className="mr-1.5 h-4 w-4" /> Selecionar XLSX
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </PageHeader>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-20 text-center border-dashed">
          <Upload className="h-10 w-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="font-semibold">Nenhum arquivo carregado</p>
            <p className="max-w-md text-sm text-muted-foreground mx-auto">
              Selecione o arquivo XLSX gerado pela ferramenta de exportação. O sistema validará cada linha antes de gravar.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3 bg-card border">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Total Analisado</div>
              <div className="text-2xl font-bold mt-1">{rows.length}</div>
            </Card>
            <Card className="p-3 bg-success/10 border-success/20">
              <div className="text-xs text-success-foreground uppercase font-semibold">Novos</div>
              <div className="text-2xl font-bold mt-1 text-success-foreground">{counts["Novo"] || 0}</div>
            </Card>
            <Card className="p-3 bg-info/10 border-info/20">
              <div className="text-xs text-info-foreground uppercase font-semibold">Atualização Segura</div>
              <div className="text-2xl font-bold mt-1 text-info-foreground">{counts["AtualizacaoSegura"] || 0}</div>
            </Card>
            <Card className="p-3 bg-warning/10 border-warning/20">
              <div className="text-xs text-warning-foreground uppercase font-semibold">Conflitos (Ignorados)</div>
              <div className="text-2xl font-bold mt-1 text-warning-foreground">{counts["Conflito"] || 0}</div>
            </Card>
            <Card className="p-3 bg-destructive/10 border-destructive/20">
              <div className="text-xs text-destructive-foreground uppercase font-semibold">Duplicidades</div>
              <div className="text-2xl font-bold mt-1 text-destructive-foreground">{counts["Duplicidade"] || 0}</div>
            </Card>
            <Card className="p-3 bg-muted border-muted-foreground/20">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Sem Alteração</div>
              <div className="text-2xl font-bold mt-1 text-muted-foreground">{counts["SemAlteracoes"] || 0}</div>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revisão de Dry-Run</CardTitle>
                  <CardDescription>Revise os registros marcados para importação. Apenas Novos e Atualizações Seguras podem ser importados nesta etapa.</CardDescription>
                </div>
                <Button 
                  onClick={handleExecute} 
                  disabled={importing || (counts["Novo"] === 0 && counts["AtualizacaoSegura"] === 0)}
                  className="gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {importing ? "Executando Lote..." : "Confirmar Importação Atômica"}
                </Button>
              </div>
              {progress > 0 && <Progress value={progress} className="h-1 mt-4" />}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Inc</TableHead>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Cliente / Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const isCheckable = row.classification === "Novo" || row.classification === "AtualizacaoSegura";
                    
                    return (
                      <TableRow key={row.index} className={row.classification === "Conflito" ? "bg-warning/5" : ""}>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={row.selected} 
                            disabled={!isCheckable || importing}
                            onCheckedChange={() => toggleSelect(row.index)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{row.index}</TableCell>
                        <TableCell>
                          {row.classification === "Novo" && <Badge variant="outline" className="border-success text-success bg-success/10">Novo</Badge>}
                          {row.classification === "AtualizacaoSegura" && <Badge variant="outline" className="border-info text-info bg-info/10">Atualização Segura</Badge>}
                          {row.classification === "SemAlteracoes" && <Badge variant="outline" className="text-muted-foreground">Sem Alteração</Badge>}
                          {row.classification === "Conflito" && <Badge variant="outline" className="border-warning text-warning bg-warning/10">Conflito</Badge>}
                          {row.classification === "Duplicidade" && <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10">Duplicidade</Badge>}
                          {row.classification === "Invalida" && <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10">Inválida</Badge>}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.raw["Nome"] || "Sem Nome"}
                          {row.classification === "Conflito" && (
                            <div className="text-[10px] text-muted-foreground font-normal">Requer revisão humana (edite o Excel ou a ficha)</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs space-y-1">
                          {row.reasons.map((r, i) => (
                            <div key={i} className="text-destructive flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {r}
                            </div>
                          ))}
                          
                          {Object.keys(row.safeUpdates).length > 0 && (
                            <div className="text-info-foreground">
                              <strong>Preencherá:</strong> {Object.entries(row.safeUpdates).map(([k,v]) => `${k}='${v}'`).join(", ")}
                            </div>
                          )}

                          {Object.keys(row.conflicts).length > 0 && (
                            <div className="space-y-1 mt-1">
                              {Object.entries(row.conflicts).map(([k, vals]) => (
                                <div key={k} className="flex items-center gap-2 text-warning-foreground bg-warning/10 px-2 py-0.5 rounded">
                                  <span className="font-semibold uppercase">{k}:</span>
                                  <span className="line-through opacity-70">{vals.old}</span>
                                  <ArrowRight className="h-3 w-3" />
                                  <span className="font-bold">{vals.new}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
