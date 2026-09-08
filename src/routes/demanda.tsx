import { createFileRoute } from "@tanstack/react-router";
import { DemandaPage } from "@/pages/demanda";

export const Route = createFileRoute("/demanda")({
  head: () => ({
    meta: [
      { title: "Demanda · Topaz MRP" },
      {
        name: "description",
        content:
          "Planejamento de demanda em 36 meses por modelo, com totais anuais, curva mensal e exportação.",
      },
      { property: "og:title", content: "Demanda · Topaz MRP" },
      {
        property: "og:description",
        content: "Demanda de 36 meses por modelo, totais anuais e exportação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemandaPage,
});
