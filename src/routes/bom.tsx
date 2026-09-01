import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataGrid, type DataGridColumn } from "@/components/datagrid/DataGrid";
import { EditableNumberCell } from "@/components/datagrid/EditableNumberCell";
import { useViewState } from "@/state/GridViewContext";
import { useScenario } from "@/state/ScenarioContext";
import type { BomLine } from "@/domain/types";

export const Route = createFileRoute("/bom")({
  head: () => ({
    meta: [
      { title: "BOM · Topaz MRP" },
      {
        name: "description",
        content: "Lista de materiais (Bill of Materials) da válvula Topaz.",
      },
      { property: "og:title", content: "BOM · Topaz MRP" },
      {
        property: "og:description",
        content: "Estrutura de produto da válvula Topaz com edição inline em alta densidade.",
      },
    ],
  }),
  component: BomPage,
});

interface Linha {
  line: BomLine;
  i: number;
}

function BomPage() {
  const { state, setBomQty } = useScenario();
  const [view, patchView] = useViewState("bom", { tamanho: "todos", busca: "" });
  const tamanho = view.tamanho as string;
  const busca = view.busca as string;

  const matById = useMemo(
    () => new Map(state.materials.map((m) => [m.id, m])),
    [state.materials],
  );

  const linhas = useMemo<Linha[]>(() => {
    const q = busca.trim().toLowerCase();
    return state.bom
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => tamanho === "todos" || !line.modelId || line.modelId === tamanho)
      .filter(({ line }) => {
        if (!q) return true;
        const mat = matById.get(line.childId);
        return (
          line.childId.toLowerCase().includes(q) ||
          line.stageId.toLowerCase().includes(q) ||
          (mat?.descricao ?? "").toLowerCase().includes(q)
        );
      });
  }, [state.bom, tamanho, busca, matById]);

  const columns = useMemo<DataGridColumn<Linha>[]>(
    () => [
      {
        id: "parent",
        header: "Pai",
        width: 130,
        render: ({ line }) => <span className="font-medium">{line.parentId}</span>,
      },
      {
        id: "child",
        header: "Filho",
        width: 240,
        render: ({ line }) => matById.get(line.childId)?.descricao ?? line.childId,
      },
      {
        id: "modelo",
        header: "Modelo",
        width: 110,
        className: "text-muted-foreground",
        render: ({ line }) => line.modelId ?? "Ambos",
      },
      {
        id: "etapa",
        header: "Etapa",
        width: 200,
        className: "text-muted-foreground text-xs",
        render: ({ line }) => line.stageId,
      },
      {
        id: "qty",
        header: "Qtd por válvula",
        width: 140,
        align: "right",
        editable: true,
        render: ({ line, i }) => (
          <EditableNumberCell
            value={line.qtyPer}
            onCommit={(v) => setBomQty(i, v)}
            validate={(v) =>
              v !== null && v > 100000 ? "Quantidade acima do limite plausível" : null
            }
          />
        ),
      },
      {
        id: "unidade",
        header: "Unidade",
        width: 100,
        className: "text-muted-foreground",
        render: ({ line }) => matById.get(line.childId)?.unidade ?? "—",
      },
      {
        id: "status",
        header: "Status",
        width: 170,
        render: ({ line }) =>
          line.qtyPer === null ? (
            <ProvisionalBadge />
          ) : (
            <span className="text-xs text-success">Definido</span>
          ),
      },
    ],
    [matById, setBomQty],
  );

  return (
    <div>
      <PageHeader
        title="BOM · Estrutura de Produto"
        subtitle="Edição inline com navegação por teclado (Setas, Tab, Enter). Quantidades DADO A CONFIRMAR não são aprovadas para compra."
        actions={
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar componente…"
              value={busca}
              onChange={(e) => patchView({ busca: e.target.value })}
              className="w-56"
            />
            <Select value={tamanho} onValueChange={(v) => patchView({ tamanho: v })}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tamanhos</SelectItem>
                {state.products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <DataGrid
              rows={linhas}
              columns={columns}
              rowKey={(r) => String(r.i)}
              height={640}
              emptyMessage="Nenhuma linha de BOM para os filtros atuais."
            />
          </CardContent>
        </Card>
        <p className="mt-3 text-xs text-muted-foreground">
          {linhas.length} linhas · grid virtualizado, otimizado para desktop de alta densidade.
        </p>
      </div>
    </div>
  );
}
