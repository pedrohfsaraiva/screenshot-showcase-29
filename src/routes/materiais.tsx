import { createFileRoute } from "@tanstack/react-router";
import { MateriaisHubPage } from "@/pages/materiais-hub";

export const Route = createFileRoute("/materiais")({
  head: () => ({
    meta: [
      { title: "Necessidade de Materiais · Topaz MRP" },
      {
        name: "description",
        content:
          "Necessidade bruta e de produção por período, composição (BOM) editável e cadastro de materiais.",
      },
      { property: "og:title", content: "Necessidade de Materiais · Topaz MRP" },
      {
        property: "og:description",
        content: "Planejamento de materiais para 1, 2 e 3 anos com rendimentos aplicados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MateriaisHubPage,
});
