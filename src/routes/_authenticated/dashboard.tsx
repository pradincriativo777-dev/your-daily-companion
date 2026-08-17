import { useState, useEffect } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileDrawer, MobileBottomBar } from "@/components/layout/MobileNavigation";
import { GlobalSearchDialog } from "@/components/layout/GlobalSearchDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jansol_sidebar_collapsed") === "true";
    }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const user = Route.useRouteContext().user;

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("jansol_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#171716] flex flex-col selection:bg-[#FAF3D6] selection:text-[#0B0B0C]">
      {/* Cabeçalho Topbar */}
      <Topbar
        collapsed={collapsed}
        onToggleSidebar={toggleSidebar}
        onOpenMobileNav={() => setMobileOpen(true)}
        userEmail={user?.email}
      />

      {/* Corpo Principal */}
      <div className="flex flex-1 min-h-[calc(100vh-3.75rem)]">
        {/* Sidebar Desktop */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleSidebar}
        />

        {/* Drawer Mobile */}
        <MobileDrawer
          open={mobileOpen}
          onOpenChange={setMobileOpen}
        />

        {/* Área de Conteúdo */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Barra Inferior para iPhone */}
      <MobileBottomBar onOpenSearch={() => setSearchOpen(true)} />

      {/* Diálogo de Busca Global */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
