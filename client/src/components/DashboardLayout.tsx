import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, Package, Layers, ShoppingCart, FileText, Settings, Clipboard, ArrowUpFromLine, Building2, ChevronDown, ChevronRight, Menu, Wrench, KeyRound, Store } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path?: string;
  requiredRole?: "admin" | "supervisor" | "user";
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    icon: Package,
    label: "Produtos",
    requiredRole: "user",
    submenu: [
      { icon: Package, label: "Todos os Produtos", path: "/products" },
      { icon: Package, label: "Estoque", path: "/products/estoque" },
      { icon: Package, label: "Produtos Específicos", path: "/products/especificos" },
    ],
  },
  { icon: Layers, label: "Estoque", path: "/stock", requiredRole: "user" },
  { icon: ShoppingCart, label: "Ordens de Compra", path: "/purchase-orders", requiredRole: "user" },
  { icon: Clipboard, label: "Solicitações de Compra", path: "/purchase-requests", requiredRole: "user" },
  { icon: ArrowUpFromLine, label: "Requisições de Saída", path: "/exit-requests", requiredRole: "user" },
  { icon: Store, label: "Catálogo de Fornecedores", path: "/fornecedores", requiredRole: "user" },
  { icon: FileText, label: "Relatórios", path: "/reports", requiredRole: "user" },
  {
    icon: Building2,
    label: "Patrimônio",
    requiredRole: "user",
    submenu: [
      { icon: Building2, label: "Dashboard", path: "/patrimonio" },
      { icon: Building2, label: "Bens Patrimoniais", path: "/patrimonio/bens" },
      { icon: Building2, label: "Novo Patrimônio", path: "/patrimonio/novo" },
      { icon: Wrench, label: "Controle de Ferramentas", path: "/patrimonio/ferramentas" },
      { icon: Building2, label: "Categorias", path: "/patrimonio/categorias" },
      { icon: Building2, label: "Locais", path: "/patrimonio/locais" },
    ],
  },
  { icon: Users, label: "Usuários", path: "/users", requiredRole: "admin" },
  { icon: Settings, label: "Configurações", path: "/settings", requiredRole: "admin" },
  { icon: KeyRound, label: "Minha conta", path: "/minha-conta" },
];

const ROLE_RANK = { user: 1, supervisor: 2, admin: 3 } as const;
const hasRole = (userRole: string | undefined, required?: MenuItem["requiredRole"]) =>
  !required || (ROLE_RANK[userRole as keyof typeof ROLE_RANK] ?? 0) >= ROLE_RANK[required];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Entre para continuar
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Para acessar o sistema, faça login com seu e-mail e senha.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebar = sidebarRef.current?.querySelector('[data-slot="sidebar"]') as HTMLElement;
      const sidebarLeft = sidebar?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <div className="flex w-screen h-screen" ref={sidebarRef}>
      <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="py-5 justify-center border-b border-sidebar-border/50">
            <div className="flex flex-col items-center gap-2 px-3 transition-all w-full">
              {!isCollapsed ? (
                <>
                  <img 
                    src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663282117022/GPIpqmZteRVSuazq.png" 
                    alt="Hectares Logo" 
                    className="h-11 w-11 shrink-0 drop-shadow-md"
                  />
                  <span className="font-bold tracking-wide text-center text-sm text-sidebar-foreground/90 uppercase">
                    Gestão Hectares
                  </span>
                </>
              ) : (
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663282117022/GPIpqmZteRVSuazq.png" 
                  alt="Hectares Logo" 
                  className="h-8 w-8 shrink-0 drop-shadow-md"
                />
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 mt-2">
            <SidebarMenu className="px-3 py-1 space-y-0.5">
              {menuItems
                .filter(item => hasRole(user?.role, item.requiredRole))
                .map(item => {
                  const isActive = item.path ? location === item.path : item.submenu?.some(sub => location === sub.path);
                  const hasSubmenu = item.submenu && item.submenu.length > 0;
                  
                  return (
                    <div key={item.label}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => {
                            if (item.path) {
                              setLocation(item.path);
                            } else if (hasSubmenu) {
                              setExpandedMenu(expandedMenu === item.label ? null : item.label);
                            }
                          }}
                          tooltip={item.label}
                          className={`h-10 transition-all font-normal rounded-lg ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60"}`}
                          />
                          <span>{item.label}</span>
                          {hasSubmenu && !isCollapsed && (
                            <span className="ml-auto">
                              {expandedMenu === item.label ? <ChevronDown className="h-3.5 w-3.5 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      
                      {hasSubmenu && expandedMenu === item.label && !isCollapsed && item.submenu && (
                        <div className="pl-5 space-y-0.5 mt-1 ml-2 border-l border-sidebar-border/40">
                          {item.submenu.map(subitem => {
                            const isSubActive = location === subitem.path;
                            return (
                              <SidebarMenuItem key={subitem.path}>
                                <SidebarMenuButton
                                  isActive={isSubActive}
                                  onClick={() => setLocation(subitem.path!)}
                                  className={`h-8 text-sm font-normal rounded-md ${isSubActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${isSubActive ? "bg-sidebar-accent-foreground" : "bg-sidebar-foreground/30"}`}></span>
                                  <span>{subitem.label}</span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-sidebar-accent text-sidebar-accent-foreground">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 border-b border-border/60 px-4 sm:px-6 gap-4 flex-shrink-0 bg-white">
          <button
            onClick={toggleSidebar}
            className="h-9 w-9 flex items-center justify-center hover:bg-muted rounded-lg transition-colors focus:outline-none"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1" />
        </div>
        <div className="flex-1 overflow-auto">
          <div className="w-full h-full overflow-x-hidden flex justify-center">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </div>
  );
}
