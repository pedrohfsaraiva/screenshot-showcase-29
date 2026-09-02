import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  rendimento: number; // rendimento acumulado aplicado (1 = 100%)
  y1: number;
  y2: number;
  y3: number;
  total: number;
}

/**
 * Caminho de etapas de rendimento pelas quais o componente passa até ficar
 * disponível (aprovado) para consumo. O rendimento acumulado é o produto dos
 * yields dessas etapas. Itens comprados/consumíveis não passam por etapas de
 * rendimento → 100%.
 */
const MATERIAL_YIELD_PATH: Record<string, string[]> = {
  leaflet: ["leaflets", "leaflet_matching"],
  inner_skirt: ["inner_skirt"],
  sealing_atrial: ["sealing_atrial"],
  sealing_ventricular: ["sealing_ventricular"],
  inner_stent: ["inner_stent_prep"],
  outer_stent: ["outer_stent_prep"],
  sleeve: ["sleeves"],
};

function MrpPage() {
  const { state } = useScenario();
  const [modeloFiltro, setModeloFiltro] = useState<ModelFilter>("all");
  const [busca, setBusca] = useState("");

  const matById = useMemo(
    () => new Map(state.materials.map((m) => [m.id, m])),
    [state.materials],
  );

  // Rendimento acumulado por (modelo, material): produto dos yields das etapas
  // do caminho do componente. Fallback 1 (100%) quando não há yield cadastrado.
  const rendimentoAcumulado = useMemo(() => {
    const yieldByStageModel = new Map<string, number>();
    for (const y of state.yields) {
      if (y.valor !== null && y.valor !== undefined && y.valor > 0) {
        yieldByStageModel.set(`${y.stageId}__${y.modelId}`, y.valor);
      }
    }
    const cache = new Map<string, number>();
    return (modelo: ModelId, materialId: string): number => {
      const cacheKey = `${modelo}__${materialId}`;
      const hit = cache.get(cacheKey);
      if (hit !== undefined) return hit;
      const path = MATERIAL_YIELD_PATH[materialId] ?? [];
      let acc = 1;
      for (const stageId of path) {
        const y = yieldByStageModel.get(`${stageId}__${modelo}`);
        if (y !== undefined) acc *= y;
      }
      cache.set(cacheKey, acc);
      return acc;
    };
  }, [state.yields]);

  // Necessidade bruta anual por (modelo, material) — soma mensal × qtyPer da BOM.
  const rows = useMemo<Row[]>(() => {
    // Demanda por (modelo, ano). Ano = índice do período / 12.
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
        // Necessidade real = necessidade aprovada ÷ rendimento acumulado (ceil).
        const rend = rendimentoAcumulado(modelo, material.id);
        const bruta = (aprovada: number) =>
          definida ? Math.ceil(aprovada / rend) : 0;
        const y1 = bruta(dem[0] * qty);
        const y2 = bruta(dem[1] * qty);
        const y3 = bruta(dem[2] * qty);
        const prev = acc.get(key);
        if (prev) {
          prev.y1 += y1;
          prev.y2 += y2;
          prev.y3 += y3;
          prev.total = prev.y1 + prev.y2 + prev.y3;
          prev.definida = prev.definida && definida;
          prev.rendimento = Math.min(prev.rendimento, rend);
        } else {
          acc.set(key, {
            key,
            modelo,
            materialId: material.id,
            descricao: material.descricao,
            categoria: material.categoria,
            unidade: material.unidade,
            definida,
            rendimento: rend,
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
  }, [state.bom, state.demand, state.periodos, state.products, matById, rendimentoAcumulado, modeloFiltro, busca]);

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
              onChange={(e) => setBusca(e.target.value)}
              className="w-56"
            />
            <Select
              value={modeloFiltro}
              onValueChange={(v) => setModeloFiltro(v as ModelFilter)}
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
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Modelo</TableHead>
                  <TableHead className="w-[140px]">Componente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Ano 1 · 2027</TableHead>
                  <TableHead className="text-right">Ano 2 · 2028</TableHead>
                  <TableHead className="text-right">Ano 3 · 2029</TableHead>
                  <TableHead className="text-right">Total 3 Anos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                      Nenhuma necessidade calculada. Verifique demanda e quantidades da BOM.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium">{r.modelo}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {r.materialId}
                      </TableCell>
                      <TableCell>
                        {r.descricao}
                        {!r.definida ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-warning">
                            dado a confirmar
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.categoria}</TableCell>
                      <TableCell className="text-muted-foreground">{r.unidade}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.definida ? formatInt(r.y1) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.definida ? formatInt(r.y2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.definida ? formatInt(r.y3) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-primary">
                        {r.definida ? formatInt(r.total) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {rows.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={5} className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      Total geral (linhas filtradas)
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatInt(totals.y1)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatInt(totals.y2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatInt(totals.y3)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                      {formatInt(totals.total)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
