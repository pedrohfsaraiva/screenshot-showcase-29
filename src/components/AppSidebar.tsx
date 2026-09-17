import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarRange,
  Package,
  Factory,
  Workflow,
  Percent,
  Layers,
  ShieldCheck,
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

const groups = [
  {
    label: "Visão Geral",
    items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "Planejamento",
    items: [
      { title: "Demanda", url: "/demanda", icon: CalendarRange },
      { title: "Necessidade de Materiais", url: "/mrp", icon: Package },
      { title: "Capacidade", url: "/capacidade", icon: Factory },
    ],
  },
  {
    label: "Dados",
    items: [
      { title: "Rendimentos", url: "/rendimentos", icon: Percent },
      { title: "Rota", url: "/rota", icon: Workflow },
      { title: "BOM", url: "/bom", icon: Layers },
      { title: "Qualidade", url: "/qualidade", icon: ShieldCheck },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="gap-1">
        <div className="px-4 py-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
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

        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="data-[active=true]:bg-primary/12 data-[active=true]:font-medium data-[active=true]:text-primary"
                    >
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
