import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RendimentosPage } from "@/pages/rendimentos";
import { RotaPage } from "@/pages/rota";
import { QualidadePage } from "@/pages/qualidade";

export function RendimentosHubPage() {
  const [tab, setTab] = useState("rendimentos");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="border-b border-border px-6 pt-4">
        <TabsList>
          <TabsTrigger value="rendimentos">Rendimentos</TabsTrigger>
          <TabsTrigger value="rota">Etapas do processo</TabsTrigger>
          <TabsTrigger value="qualidade">Qualidade dos dados</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="rendimentos" className="mt-0">
        <RendimentosPage />
      </TabsContent>
      <TabsContent value="rota" className="mt-0">
        <RotaPage />
      </TabsContent>
      <TabsContent value="qualidade" className="mt-0">
        <QualidadePage />
      </TabsContent>
    </Tabs>
  );
}
