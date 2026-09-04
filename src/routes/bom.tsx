import { createFileRoute } from "@tanstack/react-router";
import { BomPage } from "@/pages/bom";

export const Route = createFileRoute("/bom")({
  head: () => ({
    meta: [
      { title: "BOM · Topaz MRP" },
      {
        name: "description",
        content: "Lista de materiais (Bill of Materials) da válvula Topaz.",
      },
    ],
  }),
  component: BomPage,
});
