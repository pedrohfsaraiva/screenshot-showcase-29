import { createFileRoute } from "@tanstack/react-router";
import { MrpPage } from "@/pages/mrp";

export const Route = createFileRoute("/mrp")({
  head: () => ({
    meta: [
      { title: "MRP Líquida · Topaz MRP" },
      {
        name: "description",
        content:
          "Consolidação anual da necessidade bruta de materiais nos 3 anos calendário (2027–2029).",
      },
    ],
  }),
  component: MrpPage,
});
