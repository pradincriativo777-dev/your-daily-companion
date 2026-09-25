export const TIPOS_CLIENTE = ["Pessoa Física", "Pessoa Jurídica"] as const;
export const TIPOS_TELHADO = [
  "Cerâmico",
  "Fibrocimento",
  "Laje",
  "Outro",
] as const;
export const TIPOS_SISTEMA = ["Banho", "Piscina", "Ambos"] as const;
export const MARCAS = [
  "Termomax",
  "Solarem",
  "Tholz",
  "Orbitec",
  "Solis",
] as const;
export const STATUS_CLIENTE = [
  "Orçamento",
  "Aprovado",
  "Instalado",
  "Em Manutenção",
  "Finalizado",
] as const;
export const ORIGENS_LEAD = [
  "Google",
  "Indicação",
  "Site",
  "WhatsApp",
  "Outro",
] as const;
export const ESPECIALIDADES = ["Instalação", "Manutenção", "Ambos"] as const;
export const STATUS_TECNICO = ["Ativo", "Inativo"] as const;
export const TIPOS_MANUTENCAO = ["Preventiva", "Corretiva", "Garantia"] as const;
export const STATUS_MANUTENCAO = [
  "Agendada",
  "Em Andamento",
  "Concluída",
] as const;
export const CATEGORIAS_GASTO = [
  "Mão de Obra",
  "Materiais",
  "Transporte",
  "Ferramentas",
  "Administrativo",
  "Outros",
] as const;
export const TIPOS_GASTO = [
  "Instalação",
  "Manutenção",
  "Operacional",
  "Outro",
] as const;
export const TIPOS_INTERACAO = [
  "WhatsApp",
  "Telefone",
  "Visita",
  "E-mail",
  "Outro",
] as const;

export const statusClienteClass: Record<string, string> = {
  "Orçamento": "bg-pending/20 text-pending-foreground border-pending/50",
  Aprovado: "bg-warning/20 text-warning-foreground border-warning/50",
  Instalado: "bg-success/20 text-success-foreground border-success/50",
  "Em Manutenção": "bg-warning/20 text-warning-foreground border-warning/50",
  Finalizado: "bg-success/20 text-success-foreground border-success/50",
};

export const statusManutencaoClass: Record<string, string> = {
  Agendada: "bg-pending/20 text-pending-foreground border-pending/50",
  "Em Andamento": "bg-warning/20 text-warning-foreground border-warning/50",
  "Concluída": "bg-success/20 text-success-foreground border-success/50",
};

export const GOLD = "#D4A017";
export const BLACK = "#0D0D0D";

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.length > 10 ? value.slice(0, 10) : value;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const then = new Date(`${value.slice(0, 10)}T00:00:00`);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / 86400000);
}

export function daysUntil(value: string | null | undefined): number | null {
  const d = daysSince(value);
  return d === null ? null : -d;
}

export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function exportCSV(
  filename: string,
  rows: Array<Record<string, unknown>>,
) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
