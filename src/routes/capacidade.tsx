import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/capacidade")({
  head: () => ({
    meta: [
      { title: "Capacidade · Topaz MRP" },
      { name: "description", content: "Planejamento de capacidade em horas padrão." },
    ],
  }),
  component: CapacidadePage,
});

function CapacidadePage() {
  return (
    <div>
      <PageHeader
        title="Capacidade"
        subtitle="Módulo em preparação para a próxima iteração."
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Planejamento em horas padrão <ProvisionalBadge label="EM CONSTRUÇÃO" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Nesta fase, o motor MRP e os yields por gate estão implementados. O
              planejamento de capacidade (FTE, utilização, gargalos por recurso)
              será construído sobre a rota e os yields já disponíveis.
            </p>
            <p>
              Defaults a partir da especificação: stentless = 2 un/dia/operador, Inner
              = 1 un/dia/operador, Full = 1,5 op-dia (TR1P-45) e 2,5 op-dia (TR1P-55).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
