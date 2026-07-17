import type { ProductModel, SourceRef } from "@/domain/types";

const src: SourceRef = {
  documento: "Especificação Topaz",
  status: "provisorio",
};

export const products: ProductModel[] = [
  {
    id: "TR1P-45",
    nome: "Válvula Topaz 45",
    aliases: ["TRC 45", "TC-M"],
    bomRevision: "R0-PROV",
    routeRevision: "R0-PROV",
  },
  {
    id: "TR1P-55",
    nome: "Válvula Topaz 55",
    aliases: ["TRM 55", "TC-L"],
    bomRevision: "R0-PROV",
    routeRevision: "R0-PROV",
  },
];

export const modelSourceDefault = src;
