import { createFileRoute } from "@tanstack/react-router";
import { CenariosPage } from "@/pages/cenarios";

export const Route = createFileRoute("/cenarios")({
  head: () => ({
    meta: [
      { title: "Cenários · Topaz MRP" },
      {
        name: "description",
        content:
          "Planejamento de demanda em 36 meses por modelo, com totais anuais, curva mensal e exportação de cenário.",
      },
      { property: "og:title", content: "Cenários · Topaz MRP" },
      {
        property: "og:description",
        content: "Demanda de 36 meses por modelo, totais anuais e exportação do cenário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CenariosPage,
});
