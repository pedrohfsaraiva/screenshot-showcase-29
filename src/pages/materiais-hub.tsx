import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MrpPage } from "@/pages/mrp";
import { BomPage } from "@/pages/bom";
import { MateriaisPage } from "@/pages/materiais";

export function MateriaisHubPage() {
  const [tab, setTab] = useState("necessidade");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="border-b border-border px-6 pt-4">
        <TabsList>
          <TabsTrigger value="necessidade">Necessidade</TabsTrigger>
          <TabsTrigger value="bom">Composição (BOM)</TabsTrigger>
          <TabsTrigger value="materiais">Materiais</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="necessidade" className="mt-0">
        <MrpPage />
      </TabsContent>
      <TabsContent value="bom" className="mt-0">
        <BomPage />
      </TabsContent>
      <TabsContent value="materiais" className="mt-0">
        <MateriaisPage />
      </TabsContent>
    </Tabs>
  );
}
