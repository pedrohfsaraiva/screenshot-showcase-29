import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GitBranch,
  Package,
  Boxes,
  Factory,
  DollarSign,
  ShieldCheck,
  Settings,
  ClipboardList,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Visão Geral", url: "/", icon: LayoutDashboard },
  { title: "Rota (Pipeline)", url: "/rota", icon: GitBranch },
  { title: "BOM", url: "/bom", icon: Boxes },
  { title: "Materiais", url: "/materiais", icon: Package },
  { title: "MRP Líquida", url: "/mrp", icon: ClipboardList },
  { title: "Capacidade", url: "/capacidade", icon: Factory },
  { title: "Custos", url: "/custos", icon: DollarSign },
  { title: "Qualidade dos Dados", url: "/qualidade", icon: ShieldCheck },
  { title: "Cenários", url: "/cenarios", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              T
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">
                Topaz MRP
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Manufatura · 36m
              </div>
            </div>
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Planejamento</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
