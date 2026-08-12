import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScenario } from "@/state/ScenarioContext";
import { reverseExplode } from "@/engine/reverseExplosion";
import { formatInt } from "@/lib/format";

// Constantes de conversão de capacidade
const DIAS_UTEIS_POR_MES = 22;

export const Route = createFileRoute("/capacidade")({
  head: () => ({
    meta: [
      { title: "Capacidade · Topaz MRP" },
      {
        name: "description",
        content:
          "Planejamento de capacidade em FTE a partir das taxas de produção por etapa.",
      },
    ],
  }),
  component: CapacidadePage,
});

function CapacidadePage() {
  const { state, setCapacity } = useScenario();
  const [ano, setAno] = useState<string>("todos");
  const [tamanho, setTamanho] = useState<string>("todos");

  const anos = useMemo(
    () => Array.from(new Set(state.periodos.map((p) => p.slice(0, 4)))).sort(),
    [state.periodos],
  );

  const periodosFiltrados = useMemo(
    () =>
      ano === "todos"
        ? state.periodos
        : state.periodos.filter((p) => p.startsWith(ano)),
    [state.periodos, ano],
  );

  // Necessidade bruta por etapa: soma da entrada bruta de cada modelo, considerando
  // a demanda filtrada (ano/tamanho) e os yields por modelo.
  const necessidadePorEtapa = useMemo(() => {
    const acc: Record<string, number> = {};
    const periodosSet = new Set(periodosFiltrados);
    for (const p of state.products) {
      if (tamanho !== "todos" && p.id !== tamanho) continue;
      const demanda = state.demand
        .filter((d) => d.modelId === p.id && periodosSet.has(d.periodo))
        .reduce((a, d) => a + d.demanda, 0);
      if (demanda <= 0) continue;
      const exp = reverseExplode(demanda, state.stages, state.yields, p.id);
      for (const r of exp.reconciliacao) {
        acc[r.stageId] = (acc[r.stageId] ?? 0) + r.entradaBruta;
      }
    }
    return acc;
  }, [state.demand, state.products, state.stages, state.yields, periodosFiltrados, tamanho]);

  const mesesHorizonte = periodosFiltrados.length || 36;
  const diasHorizonte = mesesHorizonte * DIAS_UTEIS_POR_MES;

  const stagesSorted = useMemo(
    () => [...state.stages].sort((a, b) => a.ordem - b.ordem),
    [state.stages],
  );

  return (
    <div>
      <PageHeader
        title="Capacidade · Tempos e Métodos"
        subtitle={`FTE calculado sobre a necessidade bruta do período filtrado (${mesesHorizonte} meses × ${DIAS_UTEIS_POR_MES} dias úteis).`}
      />
      <div className="px-6 pt-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Ano
          </label>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os anos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Tamanho
          </label>
          <Select value={tamanho} onValueChange={setTamanho}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tamanhos</SelectItem>
              {state.products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-6">
        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Necessidade bruta</TableHead>
                  <TableHead className="text-right">Unidades / dia / operador</TableHead>
                  <TableHead className="text-right">Operadores disponíveis</TableHead>
                  <TableHead className="text-right">FTE necessário</TableHead>
                  <TableHead className="text-right">Cobertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagesSorted.map((stage) => {
                  const cap = state.capacity[stage.id] ?? {
                    taxaPorDia: null,
                    operadores: null,
                  };
                  const necessidade = necessidadePorEtapa[stage.id] ?? 0;
                  const fteNecessario =
                    cap.taxaPorDia && cap.taxaPorDia > 0
                      ? necessidade / (cap.taxaPorDia * diasHorizonte)
                      : null;
                  const cobertura =
                    fteNecessario !== null && cap.operadores && cap.operadores > 0
                      ? cap.operadores / fteNecessario
                      : null;
                  const gap = fteNecessario !== null && cap.operadores !== null
                    ? cap.operadores - fteNecessario
                    : null;
                  const status =
                    fteNecessario === null
                      ? "muted"
                      : gap !== null && gap < 0
                        ? "danger"
                        : gap !== null && gap < 0.5
                          ? "warn"
                          : "ok";
                  return (
                    <TableRow key={stage.id} className={stage.ativo ? "" : "opacity-60"}>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">
                        {stage.ordem}
                      </TableCell>
                      <TableCell className="font-medium">
                        {stage.nome}
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {stage.tipo}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {necessidade > 0 ? formatInt(necessidade) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={cap.taxaPorDia ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCapacity(stage.id, {
                              taxaPorDia: v === "" ? null : Number(v),
                            });
                          }}
                          className="h-8 w-24 ml-auto text-right tabular-nums"
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={cap.operadores ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCapacity(stage.id, {
                              operadores: v === "" ? null : Number(v),
                            });
                          }}
                          className="h-8 w-20 ml-auto text-right tabular-nums"
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {fteNecessario === null ? "—" : fteNecessario.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {cobertura === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              status === "danger"
                                ? "text-destructive font-semibold"
                                : status === "warn"
                                  ? "text-warning font-semibold"
                                  : "text-success font-semibold"
                            }
                          >
                            {(cobertura * 100).toFixed(0)}%
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="mt-4 text-xs text-muted-foreground">
          FTE necessário = necessidade bruta ÷ (unidades/dia/operador × {diasHorizonte} dias
          úteis do horizonte). Cobertura compara operadores disponíveis com o FTE
          necessário.
        </p>
      </div>
    </div>
  );
}
