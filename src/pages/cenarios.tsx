import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScenario } from "@/state/ScenarioContext";
import { formatInt, formatPeriod } from "@/lib/format";
import type { ModelId } from "@/domain/types";
import { cn } from "@/lib/utils";


export function CenariosPage() {
  const { state, setDemand, setDemandBulk, resetToSeed } = useScenario();
  const [modelo, setModelo] = useState<ModelId>(
    (state.products[0]?.id as ModelId) ?? "TR1P-45",
  );

  const demandaDoModelo = useMemo(
    () => state.demand.filter((d) => d.modelId === modelo),
    [state.demand, modelo],
  );

  const yearBlocks = useMemo(
    () => [0, 1, 2].map((idx) => demandaDoModelo.slice(idx * 12, idx * 12 + 12)),
    [demandaDoModelo],
  );

  const yearTotals = useMemo(
    () => yearBlocks.map((block) => block.reduce((a, d) => a + d.demanda, 0)),
    [yearBlocks],
  );

  const yearLabels = useMemo(
    () => [0, 1, 2].map((i) => state.periodos[i * 12]?.slice(0, 4) ?? `Y${i + 1}`),
    [state.periodos],
  );

  const chartData = useMemo(
    () =>
      demandaDoModelo.map((d) => ({
        periodo: formatPeriod(d.periodo),
        demanda: d.demanda,
      })),
    [demandaDoModelo],
  );

  const totalModelo = yearTotals.reduce((a, b) => a + b, 0);

  const distribuirAno = (yearIdx: number, total: number) => {
    const block = yearBlocks[yearIdx];
    if (!block?.length) return;
    const safe = Math.max(0, Math.floor(total));
    const base = Math.floor(safe / 12);
    const resto = safe - base * 12;
    const updates: Record<string, number> = {};
    block.forEach((d, i) => {
      updates[d.periodo] = i === 11 ? base + resto : base;
    });
    setDemandBulk(modelo, updates);
  };

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
    const rows = state.demand.map((d) => `${d.modelId},${d.periodo},${d.demanda}`).join("\n");
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
        subtitle={`Cenário ${state.scenarioId} · base ${state.baseDate} · horizonte de 36 meses. A demanda aqui alimenta MRP e Capacidade em tempo real.`}
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

      <div className="p-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Painel esquerdo: modelos */}
        <div className="space-y-4">
          {state.products.map((p) => {
            const serie = state.demand.filter((d) => d.modelId === p.id);
            const total = serie.reduce((a, d) => a + d.demanda, 0);
            const anos = [0, 1, 2].map((i) =>
              serie.slice(i * 12, i * 12 + 12).reduce((a, d) => a + d.demanda, 0),
            );
            const ativo = p.id === modelo;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setModelo(p.id as ModelId)}
                className={cn(
                  "w-full text-left rounded-lg border p-4 transition-colors",
                  ativo
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">{p.id}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">
                      {formatInt(total)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      un / 3 anos
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={serie.map((d) => ({ v: d.demanda }))}>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="var(--color-primary)"
                        fill="var(--color-primary)"
                        fillOpacity={0.18}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  {anos.map((v, i) => (
                    <div key={i} className="rounded-md bg-muted/40 py-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {yearLabels[i]}
                      </div>
                      <div className="text-xs font-semibold tabular-nums">
                        {formatInt(v)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-[11px] text-muted-foreground">
                  BOM {p.bomRevision} · Rota {p.routeRevision}
                </div>
              </button>
            );
          })}
        </div>

        {/* Painel direito */}
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Label
                    htmlFor={`total-y${i + 1}`}
                    className="text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    Total {yearLabels[i]} · {modelo}
                  </Label>
                  <Input
                    id={`total-y${i + 1}`}
                    type="number"
                    min={0}
                    value={yearTotals[i] ?? 0}
                    onChange={(e) => distribuirAno(i, Number(e.target.value) || 0)}
                    className="mt-2 h-11 text-right text-xl font-semibold tabular-nums"
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Distribui igualmente nos 12 meses (resto no mês 12).
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Curva de demanda · {modelo} · {formatInt(totalModelo)} un em 36 meses
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              {totalModelo > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="periodo"
                      tick={{ fontSize: 11 }}
                      interval={2}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      width={48}
                      stroke="var(--color-muted-foreground)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="demanda"
                      name="Demanda (un)"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  Nenhuma demanda cadastrada para {modelo}.
                  <Button size="sm" onClick={() => distribuirAno(0, 120)}>
                    Preencher {yearLabels[0]} com 120 un
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Demanda mensal · {modelo}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="0">
                <TabsList>
                  {[0, 1, 2].map((i) => (
                    <TabsTrigger key={i} value={String(i)}>
                      {yearLabels[i]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {[0, 1, 2].map((i) => (
                  <TabsContent key={i} value={String(i)} className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead className="text-right">Demanda (un)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(yearBlocks[i] ?? []).map((d) => (
                          <TableRow key={d.periodo}>
                            <TableCell>{formatPeriod(d.periodo)}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                value={d.demanda}
                                onChange={(e) =>
                                  setDemand(
                                    modelo,
                                    d.periodo,
                                    Math.max(0, Number(e.target.value) || 0),
                                  )
                                }
                                className="ml-auto w-28 text-right tabular-nums"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
