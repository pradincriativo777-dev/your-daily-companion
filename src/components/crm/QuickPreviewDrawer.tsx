import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/crm/ui";
import { formatDate, formatCurrency } from "@/lib/crm";
import { User, Phone, MapPin, ExternalLink, Calendar, FileText, CheckCircle2 } from "lucide-react";

export interface QuickPreviewItem {
  type: "cliente" | "ordem" | "tarefa" | "alerta";
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  details?: Record<string, string | number | null | undefined>;
  fullPath: string;
}

export function QuickPreviewDrawer({
  item,
  onOpenChange,
}: {
  item: QuickPreviewItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  return (
    <Sheet open={Boolean(item)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-white p-6 border-l border-[#E7E5DF] flex flex-col justify-between">
        <div className="space-y-6">
          <SheetHeader className="border-b border-[#E7E5DF] pb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#FAF3D6] px-2.5 py-0.5 text-xs font-semibold text-[#D9A514] border border-[#D9A514]/30 uppercase tracking-wider">
                Resumo Rápido · {item.type}
              </span>
            </div>
            <SheetTitle className="text-xl font-bold text-[#0B0B0C] mt-2">
              {item.title}
            </SheetTitle>
            {item.subtitle && (
              <SheetDescription className="text-sm text-[#6E6D68]">
                {item.subtitle}
              </SheetDescription>
            )}
          </SheetHeader>

          {item.status && (
            <div className="flex items-center justify-between rounded-xl bg-[#F8F7F3] p-3 border border-[#E7E5DF]">
              <span className="text-xs font-semibold text-[#6E6D68]">Status Atual</span>
              <StatusBadge status={item.status} />
            </div>
          )}

          {/* Lista de detalhes */}
          {item.details && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6E6D68]">
                Informações Principais
              </h4>
              <div className="rounded-xl border border-[#E7E5DF] divide-y divide-[#E7E5DF] bg-[#F8F7F3]/40">
                {Object.entries(item.details).map(([key, val]) => (
                  <div key={key} className="flex justify-between p-3 text-xs">
                    <span className="font-medium text-[#6E6D68]">{key}</span>
                    <span className="font-semibold text-[#0B0B0C] text-right">{val ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botão de Ação Direta */}
        <div className="border-t border-[#E7E5DF] pt-4 mt-auto">
          <Link
            to={item.fullPath as any}
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0B0B0C] px-4 py-3 text-sm font-semibold text-white hover:bg-[#171716] transition-colors shadow-xs"
          >
            <span>Abrir Cadastro Completo</span>
            <ExternalLink className="h-4 w-4 text-[#D9A514]" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
