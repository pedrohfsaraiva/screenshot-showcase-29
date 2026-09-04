import { createFileRoute } from "@tanstack/react-router";
import { CapacidadePage } from "@/pages/capacidade";

export const Route = createFileRoute("/capacidade")({
  head: () => ({
    meta: [
      { title: "Capacidade · Topaz MRP" },
      {
        name: "description",
        content:
          "Capacidade em horas padrão: calendário editável, FTE necessário, utilização, backlog e gargalo mensal por recurso.",
      },
      { property: "og:title", content: "Capacidade · Topaz MRP" },
      {
        property: "og:description",
        content:
          "Planejamento de capacidade em horas padrão com gargalo mensal, utilização e FTE adicional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CapacidadePage,
});
