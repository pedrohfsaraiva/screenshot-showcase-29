import { createFileRoute } from "@tanstack/react-router";
import { MateriaisPage } from "@/pages/materiais";

export const Route = createFileRoute("/materiais")({
  head: () => ({
    meta: [
      { title: "Materiais · Topaz MRP" },
      {
        name: "description",
        content: "Cadastro de materiais, embalagens e consumíveis.",
      },
    ],
  }),
  component: MateriaisPage,
});
