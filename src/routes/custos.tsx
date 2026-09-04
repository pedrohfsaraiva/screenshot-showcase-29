import { createFileRoute } from "@tanstack/react-router";
import { CustosPage } from "@/pages/custos";

export const Route = createFileRoute("/custos")({
  head: () => ({
    meta: [
      { title: "Custos · Topaz MRP" },
      { name: "description", content: "Custeio de materiais e serviços." },
    ],
  }),
  component: CustosPage,
});
