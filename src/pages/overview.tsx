import { useNavigate, useSearch } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dashboard } from "@/pages/index";
import { CenariosPage } from "@/pages/cenarios";

export function OverviewPage() {
  const search = useSearch({ from: "/" }) as { tab?: string };
  const navigate = useNavigate();
  const tab = search.tab === "demanda" ? "demanda" : "resumo";

  return (
    <Tabs
      value={tab}
      onValueChange={(v) =>
        navigate({ to: "/", search: { tab: v === "demanda" ? "demanda" : "resumo" } })
      }
    >
      <div className="border-b border-border px-6 pt-4">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="demanda">Demanda</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="resumo" className="mt-0">
        <Dashboard />
      </TabsContent>
      <TabsContent value="demanda" className="mt-0">
        <CenariosPage />
      </TabsContent>
    </Tabs>
  );
}
