import { createFileRoute } from "@tanstack/react-router";
import { RotaPage } from "@/pages/rota";

export const Route = createFileRoute("/rota")({
  head: () => ({
    meta: [
      { title: "Rota · Visual Pipeline · Topaz MRP" },
      {
        name: "description",
        content:
          "Pipeline visual de manufatura Topaz. Ajuste yields por gate e por modelo e veja o impacto em tempo real na necessidade bruta e no RTY.",
      },
    ],
  }),
  component: RotaPage,
});
