import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
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
import { useViewState } from "@/state/GridViewContext";
import { useScenario } from "@/state/ScenarioContext";
import { formatInt } from "@/lib/format";
import type { ModelId } from "@/domain/types";

export const Route = createFileRoute("/mrp")({
  head: () => ({
    meta: [
      { title: "MRP Líquida · Topaz MRP" },
      {
        name: "description",
        content:
          "Consolidação anual da necessidade bruta de materiais nos 3 anos calendário (2027–2029).",
      },
      { property: "og:title", content: "MRP Líquida · Topaz MRP" },
      {
        property: "og:description",
        content: "Necessidade bruta consolidada por ano calendário em grid virtualizado.",
      },
    ],
  }),
  component: MrpPage,
});

type ModelFilter = "all" | ModelId;

interface Row {
  key: string;
  modelo: ModelId;
  materialId: string;
  descricao: string;
  categoria: string;
  unidade: string;
  definida: boolean;
  y1: number;
  y2: number;
  y3: number;
  total: number;
}

function MrpPage() {
  const { state } = useScenario();
  const [view, patchView] = useViewState("mrp", { modeloFiltro: "all", busca: "" });
  const modeloFiltro = view.modeloFiltro as ModelFilter;
  const busca = view.busca as string;

  const matById = useMemo(
    () => new Map(state.materials.map((m) => [m.id, m])),
    [state.materials],
  );

  const rows = useMemo<Row[]>(() => {
    const demandaAnual: Record<string, [number, number, number]> = {};
    for (const p of state.products) {
      demandaAnual[p.id] = [0, 0, 0];
    }
    for (const d of state.demand) {
      const idx = state.periodos.indexOf(d.periodo);
      if (idx < 0) continue;
      const yr = Math.floor(idx / 12);
      if (yr < 0 || yr > 2) continue;
      const arr = demandaAnual[d.modelId];
      if (arr) arr[yr] += d.demanda;
    }

    const acc = new Map<string, Row>();

    for (const line of state.bom) {
      const definida = line.qtyPer !== null && line.qtyPer !== undefined;
      const qty = definida ? (line.qtyPer as number) : 0;
      const material = matById.get(line.childId);
      if (!material) continue;

      const modelos: ModelId[] = line.modelId
        ? [line.modelId]
        : state.products.map((p) => p.id);

      for (const modelo of modelos) {
        const dem = demandaAnual[modelo] ?? [0, 0, 0];
        const key = `${modelo}__${material.id}`;
        const y1 = dem[0] * qty;
        const y2 = dem[1] * qty;
        const y3 = dem[2] * qty;
        const prev = acc.get(key);
        if (prev) {
          prev.y1 += y1;
          prev.y2 += y2;
          prev.y3 += y3;
          prev.total = prev.y1 + prev.y2 + prev.y3;
          prev.definida = prev.definida && definida;
        } else {
          acc.set(key, {
            key,
            modelo,
            materialId: material.id,
            descricao: material.descricao,
            categoria: material.categoria,
            unidade: material.unidade,
            definida,
            y1,
            y2,
            y3,
            total: y1 + y2 + y3,
          });
        }
      }
    }

    const list = Array.from(acc.values());
    const filtered = list.filter((r) => {
      if (modeloFiltro !== "all" && r.modelo !== modeloFiltro) return false;
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        if (
          !r.descricao.toLowerCase().includes(q) &&
          !r.materialId.toLowerCase().includes(q) &&
          !r.categoria.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    filtered.sort(
      (a, b) =>
        a.modelo.localeCompare(b.modelo) ||
        a.categoria.localeCompare(b.categoria) ||
        a.descricao.localeCompare(b.descricao),
    );
    return filtered;
  }, [state.bom, state.demand, state.periodos, state.products, matById, modeloFiltro, busca]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.y1 += r.y1;
        acc.y2 += r.y2;
        acc.y3 += r.y3;
        acc.total += r.total;
        return acc;
      },
      { y1: 0, y2: 0, y3: 0, total: 0 },
    );
  }, [rows]);

  const columns = useMemo<DataGridColumn<Row>[]>(
    () => [
      {
        id: "modelo",
        header: "Modelo",
        width: 110,
        render: (r) => <span className="font-medium">{r.modelo}</span>,
      },
      {
        id: "componente",
        header: "Componente",
        width: 170,
        className: "text-muted-foreground text-xs",
        render: (r) => r.materialId,
      },
      {
        id: "descricao",
        header: "Descrição",
        width: 260,
        render: (r) => (
          <span>
            {r.descricao}
            {!r.definida ? (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-warning">
                dado a confirmar
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: "categoria",
        header: "Categoria",
        width: 170,
        className: "text-muted-foreground",
        render: (r) => r.categoria,
      },
      {
        id: "unidade",
        header: "Unidade",
        width: 90,
        className: "text-muted-foreground",
        render: (r) => r.unidade,
      },
      {
        id: "y1",
        header: "Ano 1 · 2027",
        width: 130,
        align: "right",
        render: (r) => (r.definida ? formatInt(r.y1) : "—"),
      },
      {
        id: "y2",
        header: "Ano 2 · 2028",
        width: 130,
        align: "right",
        render: (r) => (r.definida ? formatInt(r.y2) : "—"),
      },
      {
        id: "y3",
        header: "Ano 3 · 2029",
        width: 130,
        align: "right",
        render: (r) => (r.definida ? formatInt(r.y3) : "—"),
      },
      {
        id: "total",
        header: "Total 3 Anos",
        width: 140,
        align: "right",
        className: "font-semibold text-primary",
        render: (r) => (r.definida ? formatInt(r.total) : "—"),
      },
    ],
    [],
  );

  const footer =
    rows.length > 0 ? (
      <>
        <div className="px-2 py-2.5 text-xs uppercase tracking-wider text-muted-foreground" style={{ width: 800, minWidth: 800 }}>
          Total geral (linhas filtradas)
        </div>
        <div className="px-2 py-2.5 text-right tabular-nums font-semibold" style={{ width: 130, minWidth: 130 }}>
          {formatInt(totals.y1)}
        </div>
        <div className="px-2 py-2.5 text-right tabular-nums font-semibold" style={{ width: 130, minWidth: 130 }}>
          {formatInt(totals.y2)}
        </div>
        <div className="px-2 py-2.5 text-right tabular-nums font-semibold" style={{ width: 130, minWidth: 130 }}>
          {formatInt(totals.y3)}
        </div>
        <div className="px-2 py-2.5 text-right tabular-nums font-semibold text-primary" style={{ width: 140, minWidth: 140 }}>
          {formatInt(totals.total)}
        </div>
      </>
    ) : null;

  return (
    <div>
      <PageHeader
        title="MRP Líquida · Consolidação 3 anos"
        subtitle="Necessidade bruta de componentes consolidada por ano calendário (2027 · 2028 · 2029)."
        actions={
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar componente…"
              value={busca}
              onChange={(e) => patchView({ busca: e.target.value })}
              className="w-56"
            />
            <Select
              value={modeloFiltro}
              onValueChange={(v) => patchView({ modeloFiltro: v })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os modelos</SelectItem>
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
              rows={rows}
              columns={columns}
              rowKey={(r) => r.key}
              height={640}
              emptyMessage="Nenhuma necessidade calculada. Verifique demanda e quantidades da BOM."
              footer={footer}
            />
          </CardContent>
        </Card>
        <p className="mt-3 text-xs text-muted-foreground">
          {rows.length} linhas · grid virtualizado para milhares de registros.
        </p>
      </div>
    </div>
  );
}
