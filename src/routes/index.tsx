import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/pages/index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Topaz MRP" },
      {
        name: "description",
        content:
          "Painel executivo de previsão de demanda, RTY e necessidade bruta por gate.",
      },
    ],
  }),
  component: Dashboard,
});
