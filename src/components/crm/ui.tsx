import type { ReactNode } from "react";
import { Loader2, Inbox, ArrowUpRight, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PageHeader({
  title,
  description,
  children,
  badgeText,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  badgeText?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#E7E5DF]/60 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-[#0B0B0C]">
            {title}
          </h1>
          {badgeText && (
            <span className="inline-flex items-center rounded-full bg-[#FAF3D6] px-2.5 py-0.5 text-xs font-semibold text-[#D9A514] border border-[#D9A514]/30">
              {badgeText}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm font-normal text-[#6E6D68]">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      )}
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
      className={cn(
        "whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors border",
        map[status] ?? "bg-[#F0EEE9] text-[#171716] border-[#E7E5DF]"
      )}
    >
      {status}
    </Badge>
  );
}

export function Loading({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-[#6E6D68]">
      <Loader2 className="h-6 w-6 animate-spin text-[#D9A514]" />
      <span className="font-medium tracking-wide">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E7E5DF] bg-white p-10 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF3D6] text-[#D9A514]">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[#0B0B0C]">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-[#6E6D68]">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  fonte,
  onClick,
  tooltip,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: any;
  tone?: "default" | "success" | "warning" | "pending" | "danger";
  fonte?: string;
  onClick?: () => void;
  tooltip?: string;
}) {
  const tones: Record<string, string> = {
    default: "text-[#24231F]",
    success: "text-[#2E7D32]",
    warning: "text-[#D97706]",
    pending: "text-[#C8794A]",
    danger: "text-[#C53030]",
  };

  const isIndisponivel = String(value) === "Não disponível" || String(value) === "Sem informação";

  const content = (
    <div
      onClick={onClick}
      className={cn(
        "jansol-bento-card flex flex-col justify-between p-4 transition-all duration-180",
        onClick
          ? "cursor-pointer hover:border-[#C8BFA5] hover:bg-[#FAF5E8]/40 active:scale-[0.99]"
          : "cursor-default"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#706D65]">
          {label}
        </span>
        {onClick && (
          <ArrowUpRight className="h-3.5 w-3.5 text-[#E3B94F] shrink-0" />
        )}
      </div>

      <div className="my-2.5 space-y-0.5">
        <p
          className={cn(
            "text-2xl font-black tracking-tight",
            isIndisponivel ? "text-[#99958C] text-lg font-medium italic" : tones[tone]
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="text-[11px] font-medium text-[#706D65]">{hint}</p>
        )}
      </div>

      {fonte && (
        <div className="mt-1 border-t border-[#E0DCCE]/60 pt-1.5 flex items-center justify-between">
          <span className="text-[10px] font-normal text-[#8E8C82] truncate">
            {fonte}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        {tooltip ? (
          <TooltipContent side="top" className="max-w-xs border-[#E0DCCE] bg-[#1D1C19] p-2.5 text-xs text-[#F8F6F1] shadow-md">
            {tooltip}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  );
}

export const KpiCard = MetricCard;

export function QuickAction({
  label,
  description,
  icon: Icon,
  onClick,
  variant = "default",
}: {
  label: string;
  description?: string;
  icon: any;
  onClick: () => void;
  variant?: "default" | "gold";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 min-h-[56px] w-full",
        variant === "gold"
          ? "border-[#D9A514]/40 bg-[#FAF3D6]/70 hover:bg-[#FAF3D6] hover:border-[#D9A514]"
          : "border-[#E7E5DF] bg-white hover:border-[#D7D4CC] hover:bg-[#F8F7F3]"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
            variant === "gold"
              ? "bg-[#D9A514] text-white"
              : "bg-[#0B0B0C] text-white"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-sm font-semibold text-[#0B0B0C]">
            {label}
          </span>
          {description && (
            <span className="block text-xs text-[#6E6D68]">{description}</span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-[#8E8D88] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0B0B0C]" />
    </button>
  );
}

export function AlertItem({
  title,
  subtitle,
  time,
  badgeText,
  type = "warning",
  actionText,
  onAction,
}: {
  title: string;
  subtitle?: string;
  time?: string;
  badgeText?: string;
  type?: "warning" | "danger" | "info" | "success";
  actionText?: string;
  onAction?: () => void;
}) {
  const styles = {
    warning: {
      border: "border-amber-200 bg-amber-50/50",
      iconBg: "bg-amber-100 text-amber-700",
      Icon: AlertTriangle,
    },
    danger: {
      border: "border-rose-200 bg-rose-50/50",
      iconBg: "bg-rose-100 text-rose-700",
      Icon: AlertCircle,
    },
    info: {
      border: "border-sky-200 bg-sky-50/50",
      iconBg: "bg-sky-100 text-sky-700",
      Icon: Info,
    },
    success: {
      border: "border-emerald-200 bg-emerald-50/50",
      iconBg: "bg-emerald-100 text-emerald-700",
      Icon: CheckCircle2,
    },
  }[type];

  const IconComponent = styles.Icon;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors",
        styles.border
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            styles.iconBg
          )}
        >
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#0B0B0C]">
              {title}
            </span>
            {badgeText && (
              <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6E6D68] border border-[#E7E5DF]">
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#6E6D68]">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {time && (
          <span className="text-xs font-medium text-[#8E8D88]">{time}</span>
        )}
        {actionText && onAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className="h-8 border-[#E7E5DF] text-xs font-semibold text-[#0B0B0C] hover:bg-white"
          >
            {actionText}
          </Button>
        )}
      </div>
    </div>
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
      <AlertDialogContent className="rounded-2xl border border-[#E7E5DF] bg-white p-6 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-[#0B0B0C]">
            Confirmar exclusão
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#6E6D68]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel className="rounded-xl border-[#E7E5DF] text-[#6E6D68]">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7E5DF] px-4 py-3.5 text-sm bg-white rounded-b-2xl">
      <span className="text-xs font-medium text-[#6E6D68]">
        {total} registro{total === 1 ? "" : "s"} · página {page} de{" "}
        {Math.max(pageCount, 1)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="h-8 rounded-lg border-[#E7E5DF] text-xs font-medium"
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className="h-8 rounded-lg border-[#E7E5DF] text-xs font-medium"
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
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = sort.field === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 font-semibold text-xs tracking-wider uppercase text-[#6E6D68] hover:text-[#0B0B0C]",
        active && "text-[#0B0B0C]",
        className
      )}
    >
      {label}
      {active && (sort.dir === "asc" ? " ↑" : " ↓")}
    </button>
  );
}
