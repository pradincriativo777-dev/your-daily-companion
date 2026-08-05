import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatusBadge } from "@/components/crm/ui";
import { formatDate } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/dashboard/importar-clientes")({
  head: () => ({
    meta: [
      { title: "Importar Clientes · JANSOL Admin" },
      {
        name: "description",
        content:
          "Importação em massa de clientes por planilha CSV ou XLSX no painel JANSOL.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImportarClientesPage,
});

const HEADERS = [
  "Nome",
  "Tipo",
  "CPF_CNPJ",
  "WhatsApp_Telefone",
  "Email",
  "Cidade",
  "Estado",
  "Endereco",
  "CEP",
  "Status_Auvochat",
  "Data_Ultimo_Contato",
  "Data_Cadastro",
  "Observacoes",
  "Origem",
];

const STATUS_MAP: Record<string, string> = {
  CLIENTE: "Instalado",
  "EM NEGOCIACAO": "Orçamento",
  "ORCAMENTO PENDENTE": "Orçamento",
  "PAGAMENTO PENDENTE": "Aprovado",
  "SERVICO AGENDADO": "Aprovado",
  "VENDA PERDIDA": "Finalizado",
  SUPORTE: "Em Manutenção",
  TECNICO: "Finalizado",
  "CONTATO PARA INDICACAO": "Orçamento",
};

const ORIGEM_MAP: Record<string, string> = {
  "conta azul": "Outro",
  auvochat: "WhatsApp",
  ambos: "WhatsApp",
};

const NOMES_IGNORADOS = ["atendimento jansol", "jansler alves"];

type LinhaImport = {
  nome: string;
  tipo: string;
  cpf_cnpj: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  endereco: string | null;
  status: string;
  ultimo_contato: string | null;
  created_at: string | null;
  observacoes: string | null;
  origem_lead: string | null;
  valor_orcamento: number;
  valor_pago: number;
};

function stripAccents(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function limparNome(raw: string) {
  return raw
    .replace(/\[NOVO\]/gi, "")
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTelefone(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d ? raw.trim() : null;
}

function parseData(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0]! : null;
}

function val(row: Record<string, unknown>, key: string): string | null {
  const found = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === key.toLowerCase(),
  );
  if (!found) return null;
  const v = row[found];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function mapear(rows: Array<Record<string, unknown>>): {
  linhas: LinhaImport[];
  ignoradas: number;
} {
  const linhas: LinhaImport[] = [];
  let ignoradas = 0;
  for (const row of rows) {
    const nome = limparNome(val(row, "Nome") ?? "");
    if (!nome || NOMES_IGNORADOS.includes(stripAccents(nome).toLowerCase())) {
      ignoradas++;
      continue;
    }
    const tipoRaw = (val(row, "Tipo") ?? "").toUpperCase();
    const statusRaw = stripAccents(val(row, "Status_Auvochat") ?? "").toUpperCase();
    const origemRaw = (val(row, "Origem") ?? "").toLowerCase();
    linhas.push({
      nome,
      tipo: tipoRaw.startsWith("PJ") ? "Pessoa Jurídica" : "Pessoa Física",
      cpf_cnpj: val(row, "CPF_CNPJ"),
      whatsapp: normalizarTelefone(val(row, "WhatsApp_Telefone")),
      email: val(row, "Email"),
      cidade: val(row, "Cidade"),
      endereco: val(row, "Endereco"),
      status: STATUS_MAP[statusRaw] ?? "Orçamento",
      ultimo_contato: parseData(val(row, "Data_Ultimo_Contato")),
      created_at: parseData(val(row, "Data_Cadastro")),
      observacoes: val(row, "Observacoes"),
      origem_lead: origemRaw ? (ORIGEM_MAP[origemRaw] ?? "Outro") : null,
      valor_orcamento: 0,
      valor_pago: 0,
    });
  }
  return { linhas, ignoradas };
}

function ImportarClientesPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [linhas, setLinhas] = useState<LinhaImport[]>([]);
  const [ignoradas, setIgnoradas] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{
    inseridos: number;
    duplicados: number;
  } | null>(null);

  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", raw: false });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("Planilha vazia");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const { linhas: ls, ignoradas: ig } = mapear(rows);
      setFileName(file.name);
      setLinhas(ls);
      setIgnoradas(ig);
      setResultado(null);
      setProgresso(0);
      if (!ls.length) toast.error("Nenhum registro válido encontrado no arquivo.");
    } catch {
      toast.error("Não foi possível ler o arquivo. Verifique o formato.");
    }
  };

  const baixarTemplate = () => {
    const csv = "\uFEFF" + HEADERS.join(";") + "\n";
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = async () => {
    setImportando(true);
    setProgresso(0);
    try {
      const { data: existentes } = await supabase
        .from("clientes")
        .select("cpf_cnpj");
      const docs = new Set(
        (existentes ?? [])
          .map((c) => (c.cpf_cnpj ?? "").replace(/\D/g, ""))
          .filter(Boolean),
      );

      const aInserir: LinhaImport[] = [];
      let duplicados = 0;
      for (const l of linhas) {
        const doc = (l.cpf_cnpj ?? "").replace(/\D/g, "");
        if (doc && docs.has(doc)) {
          duplicados++;
          continue;
        }
        if (doc) docs.add(doc);
        aInserir.push(l);
      }

      const CHUNK = 100;
      let inseridos = 0;
      for (let i = 0; i < aInserir.length; i += CHUNK) {
        const lote = aInserir.slice(i, i + CHUNK).map((l) => ({
          ...l,
          created_at: l.created_at ? `${l.created_at}T12:00:00Z` : undefined,
        }));
        const { error } = await supabase.from("clientes").insert(lote);
        if (error) throw error;
        inseridos += lote.length;
        setProgresso(Math.round(((i + lote.length) / (aInserir.length || 1)) * 100));
      }
      setProgresso(100);
      setResultado({ inseridos, duplicados });
      await qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(`${inseridos} clientes importados com sucesso`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao importar os clientes.",
      );
    } finally {
      setImportando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Importar Clientes"
        description="Importe clientes em massa a partir de um arquivo .csv ou .xlsx"
      >
        <Button variant="outline" onClick={baixarTemplate}>
          <Download className="mr-1.5 h-4 w-4" /> Baixar Template CSV
        </Button>
        <Button
          onClick={() => inputRef.current?.click()}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <FileUp className="mr-1.5 h-4 w-4" /> Selecionar Arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
      </PageHeader>

      {linhas.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhum arquivo selecionado</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Selecione um arquivo .csv ou .xlsx com as colunas do template. Linhas sem
            nome e clientes com CPF/CNPJ já cadastrado são ignorados automaticamente.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">{fileName}</p>
                <p className="text-muted-foreground">
                  {linhas.length} registro(s) válido(s)
                  {ignoradas > 0 && ` · ${ignoradas} linha(s) ignorada(s)`}
                </p>
              </div>
              <Button
                onClick={() => void importar()}
                disabled={importando}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {importando ? "Importando..." : "Confirmar Importação"}
              </Button>
            </div>
            {(importando || progresso > 0) && (
              <Progress value={progresso} className="mt-4 h-2" />
            )}
            {resultado && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-success/50 bg-success/10 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                <div>
                  <p className="font-medium">
                    {resultado.inseridos} clientes importados com sucesso
                  </p>
                  {resultado.duplicados > 0 && (
                    <p className="text-muted-foreground">
                      {resultado.duplicados} registro(s) pulado(s) por CPF/CNPJ
                      duplicado.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Últ. Contato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.slice(0, 10).map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell>{l.tipo}</TableCell>
                      <TableCell>{l.cpf_cnpj ?? "—"}</TableCell>
                      <TableCell>{l.whatsapp ?? "—"}</TableCell>
                      <TableCell>{l.email ?? "—"}</TableCell>
                      <TableCell>{l.cidade ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
                      </TableCell>
                      <TableCell>{l.origem_lead ?? "—"}</TableCell>
                      <TableCell>{formatDate(l.ultimo_contato)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              Pré-visualização dos primeiros 10 registros de {linhas.length}.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
