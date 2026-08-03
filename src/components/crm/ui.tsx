import type { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { statusClienteClass, statusManutencaoClass } from "@/lib/crm";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function StatusBadge({
  status,
  kind = "cliente",
}: {
  status: string;
  kind?: "cliente" | "manutencao";
}) {
  const map = kind === "cliente" ? statusClienteClass : statusManutencaoClass;
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap font-medium", map[status] ?? "")}
    >
      {status}
    </Badge>
  );
}

export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground/50" />
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "pending" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    pending: "text-pending",
    danger: "text-destructive",
  };
  return (
    <Card className="gap-0 py-4">
      <CardHeader className="px-4 pb-1">
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className={cn("text-2xl font-bold", tones[tone])}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function ConfirmDelete({
  onConfirm,
  trigger,
  description = "Esta ação não pode ser desfeita.",
}: {
  onConfirm: () => void;
  trigger: ReactNode;
  description?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        {total} registro{total === 1 ? "" : "s"} · página {page} de{" "}
        {Math.max(pageCount, 1)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

export function SortHeader({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: string;
  sort: { field: string; dir: "asc" | "desc" };
  onSort: (f: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 font-medium hover:text-accent",
        className,
      )}
    >
      {label}
      {sort.field === field && (
        <span className="text-accent">{sort.dir === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );
}
