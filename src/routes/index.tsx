import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/pages/overview";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "demanda" ? ("demanda" as const) : ("resumo" as const),
  }),
  head: () => ({
    meta: [
      { title: "Visão Geral · Topaz MRP" },
      {
        name: "description",
        content:
          "Painel simples de demanda, rendimento global, materiais e colaboradores necessários.",
      },
      { property: "og:title", content: "Visão Geral · Topaz MRP" },
      {
        property: "og:description",
        content: "Demanda, rendimento, materiais e capacidade em uma única tela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OverviewPage,
});
