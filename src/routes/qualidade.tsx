import { createFileRoute } from "@tanstack/react-router";
import { QualidadePage } from "@/pages/qualidade";

export const Route = createFileRoute("/qualidade")({
  head: () => ({
    meta: [
      { title: "Qualidade dos Dados · Topaz MRP" },
      { name: "description", content: "Verificações que impedem classificar dados como 'pronto para compra'." },
    ],
  }),
  component: QualidadePage,
});
