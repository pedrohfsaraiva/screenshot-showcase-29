import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScenario } from "@/state/ScenarioContext";
import { formatInt, formatPeriod } from "@/lib/format";
import type { ModelId } from "@/domain/types";

export const Route = createFileRoute("/cenarios")({
  head: () => ({
    meta: [
      { title: "Cenários · Topaz MRP" },
      { name: "description", content: "Cadastro de demanda, exportação e reset de cenário." },
    ],
  }),
  component: CenariosPage,
});

function CenariosPage() {
  const { state, setDemand, setDemandBulk, resetToSeed } = useScenario();
  const [modelo, setModelo] = useState<ModelId>("TR1P-45");

  const demandaDoModelo = useMemo(
    () => state.demand.filter((d) => d.modelId === modelo),
    [state.demand, modelo],
  );

  // Divide os 36 períodos em 3 blocos de 12 meses (Y1, Y2, Y3).
  const yearBlocks = useMemo(() => {
    return [0, 1, 2].map((idx) => demandaDoModelo.slice(idx * 12, idx * 12 + 12));
  }, [demandaDoModelo]);

  const yearTotals = useMemo(
    () => yearBlocks.map((block) => block.reduce((a, d) => a + d.demanda, 0)),
    [yearBlocks],
  );

  const distribuirAno = (yearIdx: number, total: number) => {
    const block = yearBlocks[yearIdx];
    if (!block.length) return;
    const safe = Math.max(0, Math.floor(total));
    const base = Math.floor(safe / 12);
    const resto = safe - base * 12;
    const updates: Record<string, number> = {};
    block.forEach((d, i) => {
      updates[d.periodo] = i === 11 ? base + resto : base;
    });
    setDemandBulk(modelo, updates);
  };

  const totalModelo = yearTotals.reduce((a, b) => a + b, 0);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topaz-mrp-${state.scenarioId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cenário exportado em JSON");
  };

  const exportCsv = () => {
    const header = "modelId,periodo,demanda\n";
    const rows = state.demand
      .map((d) => `${d.modelId},${d.periodo},${d.demanda}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topaz-mrp-demanda-${state.scenarioId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Demanda exportada em CSV");
  };

  return (
    <div>
      <PageHeader
        title="Cenários"
        subtitle={`Cenário atual: ${state.scenarioId} · base ${state.baseDate} · horizonte 36 meses.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportJson}>
              Exportar JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Resetar cenário para valores iniciais (provisórios)?")) {
                  resetToSeed();
                  toast.info("Cenário resetado");
                }
              }}
            >
              Resetar
            </Button>
          </div>
        }
      />

      <div className="p-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Modelos cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {state.products.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3">
                <div className="font-semibold">{p.nome}</div>
                <div className="text-xs text-muted-foreground">{p.id}</div>
                <div className="mt-1 text-xs">
                  Aliases:{" "}
                  <span className="text-muted-foreground">{p.aliases.join(", ")}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  BOM {p.bomRevision} · Rota {p.routeRevision}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              Demanda mensal · Total {formatInt(totalModelo)} un
            </CardTitle>
            <div className="w-48">
              <Label className="sr-only">Modelo</Label>
              <Select value={modelo} onValueChange={(v) => setModelo(v as ModelId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[540px] overflow-auto">
            <div className="sticky top-0 z-10 bg-card border-b border-border p-4 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1">
                  <Label htmlFor={`total-y${i + 1}`} className="text-xs text-muted-foreground">
                    Total Y{i + 1}
                  </Label>
                  <Input
                    id={`total-y${i + 1}`}
                    type="number"
                    min={0}
                    value={yearTotals[i] ?? 0}
                    onChange={(e) => distribuirAno(i, Number(e.target.value) || 0)}
                    className="text-right tabular-nums"
                  />
                </div>
              ))}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Demanda (un)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandaDoModelo.map((d) => (
                  <TableRow key={d.periodo}>
                    <TableCell>{formatPeriod(d.periodo)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        value={d.demanda}
                        onChange={(e) =>
                          setDemand(modelo, d.periodo, Math.max(0, Number(e.target.value) || 0))
                        }
                        className="ml-auto w-28 text-right tabular-nums"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
