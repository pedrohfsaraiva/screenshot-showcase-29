import { createFileRoute } from "@tanstack/react-router";
import { RendimentosHubPage } from "@/pages/rendimentos-hub";

export const Route = createFileRoute("/rendimentos")({
  head: () => ({
    meta: [
      { title: "Rendimentos · Qualidade de Dados · Topaz MRP" },
      {
        name: "description",
        content:
          "Base de rendimentos por componente com importação CSV, higienização automática e alerta de defasagem acima de 30 dias.",
      },
      { property: "og:title", content: "Rendimentos · Topaz MRP" },
      {
        property: "og:description",
        content:
          "Mapeamento de componentes, importação de rendimentos e monitoramento de defasagem de dados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RendimentosHubPage,
});
