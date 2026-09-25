import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ACCORDION_GROUPS } from "./Sidebar";
import { cn } from "@/lib/utils";

export function TodosModulosSheet({
  open,
  onOpenChange,
  onNavigate,
  currentPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (() => void) | undefined;
  currentPath: string;
}) {
  const [search, setSearch] = useState("");

  const filteredGroups = ACCORDION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  const handleLinkClick = () => {
    onOpenChange(false);
    if (onNavigate) onNavigate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[380px] sm:w-[460px] bg-white p-0 text-[#24231F] border-r border-[#E2DDD0] flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b border-[#E2DDD0] shrink-0 text-left space-y-4">
          <SheetTitle className="text-lg font-bold text-[#1D1C19]">
            Todos os módulos
          </SheetTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E8C82]" />
            <Input
              placeholder="Buscar módulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#F8F6F1] border-[#E2DDD0] focus-visible:ring-[#E3B94F]"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#706D65]">
              Nenhum módulo encontrado para "{search}".
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8E8C82] flex items-center gap-2">
                  <group.icon className="h-3.5 w-3.5" />
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((item: any) => {
                    const active = item.exact
                      ? currentPath === item.to || currentPath === `${item.to}/`
                      : currentPath.startsWith(item.to);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={handleLinkClick}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl p-3 transition-colors border",
                          active
                            ? "bg-[#FAF5E8] border-[#E3B94F]/40"
                            : "bg-white border-transparent hover:bg-[#F8F6F1] hover:border-[#E2DDD0]"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                            active
                              ? "bg-[#E3B94F]/20 text-[#C8794A]"
                              : "bg-[#F8F6F1] text-[#8E8C82] group-hover:bg-white group-hover:text-[#1D1C19]"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p
                            className={cn(
                              "truncate text-sm font-semibold transition-colors",
                              active ? "text-[#C8794A]" : "text-[#24231F]"
                            )}
                          >
                            {item.label}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
