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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatInt, formatPeriod } from "@/lib/format";
import {
  defaultTaxa,
  horasDisponiveisPorOperadorMes,
  learningEfficiency,
  resourceGroups,
  resourceOfStage,
} from "@/data/capacity";
import type { ModelId } from "@/domain/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


export const Route = createFileRoute("/capacidade")({
  head: () => ({
    meta: [
      { title: "Capacidade · Topaz MRP" },
      {
        name: "description",
        content:
          "Capacidade em horas padrão: calendário editável, FTE necessário, utilização, backlog e gargalo mensal por recurso.",
      },
      { property: "og:title", content: "Capacidade · Topaz MRP" },
      {
        property: "og:description",
        content:
          "Planejamento de capacidade em horas padrão com gargalo mensal, utilização e FTE adicional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CapacidadePage,
});

function num(v: string): number | null {
  return v === "" ? null : Number(v);
}

function CapacidadePage() {
  const { state, setCapacity, setCalendar } = useScenario();
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

  const cal = state.calendar;
  const horasPorOperadorMes = horasDisponiveisPorOperadorMes(cal);

  const taxaDe = (stageId: string, modelId: ModelId): number => {
    const c = state.capacity[stageId];
    const v = modelId === "TR1P-45" ? c?.taxaPorDia45 : c?.taxaPorDia55;
    return v !== null && v !== undefined && v > 0 ? v : defaultTaxa(stageId, modelId);
  };

  const operadoresDe = (resourceId: string): number =>
    state.capacity[`res:${resourceId}`]?.operadores ?? 0;

  /**
   * Carga em horas padrão por etapa e por período, somando todos os modelos
   * (recursos compartilhados acumulam a carga antes de comparar com a capacidade).
   */
  const carga = useMemo(() => {
    const porEtapaPeriodo: Record<string, Record<string, number>> = {};
    const qtdPorEtapa: Record<string, number> = {};
    for (const p of state.products) {
      if (tamanho !== "todos" && p.id !== tamanho) continue;
      for (const periodo of periodosFiltrados) {
        const demanda = state.demand
          .filter((d) => d.modelId === p.id && d.periodo === periodo)
          .reduce((a, d) => a + d.demanda, 0);
        if (demanda <= 0) continue;
        const exp = reverseExplode(demanda, state.stages, state.yields, p.id);
        // Curva de aprendizado: meses iniciais consomem mais horas padrão.
        const eff = learningEfficiency(state.periodos.indexOf(periodo));
        for (const r of exp.reconciliacao) {
          const taxa = taxaDe(r.stageId, p.id);
          const horas =
            taxa > 0 ? ((r.entradaBruta / taxa) * cal.horasPorDia) / eff : 0;
          porEtapaPeriodo[r.stageId] ??= {};
          porEtapaPeriodo[r.stageId][periodo] =
            (porEtapaPeriodo[r.stageId][periodo] ?? 0) + horas;
          qtdPorEtapa[r.stageId] = (qtdPorEtapa[r.stageId] ?? 0) + r.entradaBruta;
        }
      }
    }
    return { porEtapaPeriodo, qtdPorEtapa };
  }, [
    state.products,
    state.demand,
    state.stages,
    state.yields,
    state.capacity,
    periodosFiltrados,
    tamanho,
    cal.horasPorDia,
  ]);

  /** Agregação por recurso e por período. */
  const porRecurso = useMemo(() => {
    return resourceGroups.map((g) => {
      const horasMes: Record<string, number> = {};
      for (const periodo of periodosFiltrados) {
        let h = 0;
        for (const sid of g.stageIds) h += carga.porEtapaPeriodo[sid]?.[periodo] ?? 0;
        horasMes[periodo] = h;
      }
      const horasTotal = Object.values(horasMes).reduce((a, b) => a + b, 0);
      const operadores = operadoresDe(g.id);
      const capacidadeMes = operadores * horasPorOperadorMes;
      const fteMes = periodosFiltrados.map((p) =>
        horasPorOperadorMes > 0 ? horasMes[p] / horasPorOperadorMes : 0,
      );
      const fteMedio =
        fteMes.length > 0 ? fteMes.reduce((a, b) => a + b, 0) / fteMes.length : 0;
      const ftePico = fteMes.length > 0 ? Math.max(...fteMes) : 0;
      const utilizacao =
        capacidadeMes > 0 && periodosFiltrados.length > 0
          ? horasTotal / (capacidadeMes * periodosFiltrados.length)
          : null;
      const backlogHoras = periodosFiltrados.reduce(
        (a, p) => a + Math.max(0, horasMes[p] - capacidadeMes),
        0,
      );
      const fteAdicional = Math.max(0, Math.ceil(ftePico - operadores));
      return {
        ...g,
        horasMes,
        horasTotal,
        operadores,
        capacidadeMes,
        fteMedio,
        ftePico,
        utilizacao,
        backlogHoras,
        fteAdicional,
      };
    });
  }, [carga, periodosFiltrados, state.capacity, horasPorOperadorMes]);

  /** Gargalo mês a mês: recurso com maior utilização. */
  /** Utilização global mês a mês (carga total vs. capacidade instalada total). */
  const utilizacaoMensal = useMemo(() => {
    const capacidadeTotalMes = porRecurso.reduce((a, r) => a + r.capacidadeMes, 0);
    return periodosFiltrados.map((p) => {
      const horas = porRecurso.reduce((a, r) => a + (r.horasMes[p] ?? 0), 0);
      const util = capacidadeTotalMes > 0 ? horas / capacidadeTotalMes : null;
      return {
        periodo: p,
        label: formatPeriod(p),
        horas,
        util,
        pct: util === null ? 0 : Math.min(util * 100, 999),
      };
    });
  }, [porRecurso, periodosFiltrados]);

  const gargalos = useMemo(() => {

    return periodosFiltrados.map((p) => {
      let melhor: { nome: string; util: number | null; horas: number } | null = null;
      for (const r of porRecurso) {
        const horas = r.horasMes[p] ?? 0;
        const util = r.capacidadeMes > 0 ? horas / r.capacidadeMes : null;
        if (horas <= 0) continue;
        if (
          melhor === null ||
          (util ?? Number.POSITIVE_INFINITY) > (melhor.util ?? Number.POSITIVE_INFINITY) ||
          (util === null && melhor.util === null && horas > melhor.horas)
        ) {
          melhor = { nome: r.nome, util, horas };
        }
      }
      const totalHoras = porRecurso.reduce((a, r) => a + (r.horasMes[p] ?? 0), 0);
      return { periodo: p, gargalo: melhor, totalHoras };
    });
  }, [porRecurso, periodosFiltrados]);

  const stagesSorted = useMemo(
    () => [...state.stages].sort((a, b) => a.ordem - b.ordem),
    [state.stages],
  );

  const totalHoras = porRecurso.reduce((a, r) => a + r.horasTotal, 0);
  const fteTotalPico = porRecurso.reduce((a, r) => a + r.ftePico, 0);
  const backlogTotal = porRecurso.reduce((a, r) => a + r.backlogHoras, 0);

  const pct = (v: number | null) =>
    v === null || !Number.isFinite(v) ? "—" : `${Math.min(v * 100, 9999).toFixed(0)}%`;

  const utilClass = (v: number | null) =>
    v === null
      ? "text-muted-foreground"
      : v > 1
        ? "text-destructive font-semibold"
        : v > 0.9
          ? "text-warning font-semibold"
          : "text-success font-semibold";

  return (
    <div>
      <PageHeader
        title="Capacidade · Horas padrão"
        subtitle={`Carga convertida em horas padrão e comparada com ${horasPorOperadorMes.toFixed(1)} h/operador/mês (calendário líquido).`}
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

      <div className="p-6 space-y-6">
        {/* Calendário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Calendário e disponibilidade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["diasUteisPorMes", "Dias úteis / mês", 1, false],
                ["horasPorDia", "Horas / dia", 0.5, false],
                ["feriasDiasAno", "Férias (dias/ano)", 1, false],
                ["absenteismo", "Absenteísmo (%)", 0.5, true],
                ["treinamento", "Treinamento (%)", 0.5, true],
                ["utilizacao", "Utilização (%)", 1, true],
              ] as const
            ).map(([key, label, step, isPct]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  type="number"
                  min={0}
                  step={step}
                  value={isPct ? Number((cal[key] * 100).toFixed(2)) : cal[key]}
                  onChange={(e) => {
                    const v = num(e.target.value);
                    if (v === null) return;
                    setCalendar({ [key]: isPct ? v / 100 : v });
                  }}
                  className="h-9 text-right tabular-nums"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Horas padrão totais
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatInt(totalHoras)} h
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                FTE necessário no pico (soma dos recursos)
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {fteTotalPico.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Backlog acumulado
              </p>
              <p
                className={`mt-2 text-2xl font-semibold tabular-nums ${backlogTotal > 0 ? "text-destructive" : "text-success"}`}
              >
                {formatInt(backlogTotal)} h
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Utilização mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Utilização mensal da capacidade instalada
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {utilizacaoMensal.some((d) => d.util !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={utilizacaoMensal.filter((d) => d.util !== null)}
                  margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-40}
                    height={54}
                    textAnchor="end"
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    width={52}
                    unit="%"
                    stroke="var(--color-muted-foreground)"
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(0)}%`, "Utilização"]}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine y={100} stroke="var(--color-destructive)" strokeDasharray="4 4" />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {utilizacaoMensal
                      .filter((d) => d.util !== null)
                      .map((d) => (
                        <Cell
                          key={d.periodo}
                          fill={
                            (d.util as number) > 1
                              ? "var(--color-destructive)"
                              : (d.util as number) > 0.9
                                ? "var(--color-warning)"
                                : "var(--color-success)"
                          }
                        />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Informe operadores atuais por recurso e a demanda em Cenários para ver a
                utilização mensal.
              </div>
            )}
          </CardContent>
        </Card>


        {/* Recursos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recursos</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recurso</TableHead>
                  <TableHead className="text-right">Horas padrão</TableHead>
                  <TableHead className="text-right">FTE médio</TableHead>
                  <TableHead className="text-right">FTE pico</TableHead>
                  <TableHead className="text-right">Operadores atuais</TableHead>
                  <TableHead className="text-right">Utilização</TableHead>
                  <TableHead className="text-right">Backlog (h)</TableHead>
                  <TableHead className="text-right">FTE adicional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porRecurso.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.horasTotal > 0 ? formatInt(r.horasTotal) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.fteMedio.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.ftePico.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={state.capacity[`res:${r.id}`]?.operadores ?? ""}
                        onChange={(e) =>
                          setCapacity(`res:${r.id}`, { operadores: num(e.target.value) })
                        }
                        className="h-8 w-20 ml-auto text-right tabular-nums"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${utilClass(r.utilizacao)}`}>
                      {pct(r.utilizacao)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.backlogHoras > 0 ? (
                        <span className="text-destructive font-semibold">
                          {formatInt(r.backlogHoras)}
                        </span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {r.fteAdicional > 0 ? `+${r.fteAdicional}` : "0"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Gargalo por mês */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gargalo por mês</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Recurso gargalo</TableHead>
                  <TableHead className="text-right">Utilização</TableHead>
                  <TableHead className="text-right">Horas padrão do mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gargalos.map((g) => (
                  <TableRow key={g.periodo}>
                    <TableCell className="tabular-nums">{formatPeriod(g.periodo)}</TableCell>
                    <TableCell>
                      {g.gargalo?.nome ?? (
                        <span className="text-muted-foreground">Sem carga</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${utilClass(g.gargalo?.util ?? null)}`}
                    >
                      {pct(g.gargalo?.util ?? null)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {g.totalHoras > 0 ? formatInt(g.totalHoras) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Etapas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Taxas por etapa (unidades/dia/operador)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead className="text-right">Necessidade bruta</TableHead>
                  <TableHead className="text-right">TR1P-45</TableHead>
                  <TableHead className="text-right">TR1P-55</TableHead>
                  <TableHead className="text-right">Horas padrão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagesSorted.map((stage) => {
                  const g = resourceOfStage(stage.id);
                  const c = state.capacity[stage.id];
                  const horas = Object.values(
                    carga.porEtapaPeriodo[stage.id] ?? {},
                  ).reduce((a, b) => a + b, 0);
                  const qtd = carga.qtdPorEtapa[stage.id] ?? 0;
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
                      <TableCell className="text-xs text-muted-foreground">
                        {g?.nome ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {qtd > 0 ? formatInt(qtd) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={c?.taxaPorDia45 ?? ""}
                          onChange={(e) =>
                            setCapacity(stage.id, { taxaPorDia45: num(e.target.value) })
                          }
                          className="h-8 w-24 ml-auto text-right tabular-nums"
                          placeholder={defaultTaxa(stage.id, "TR1P-45").toFixed(2)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={c?.taxaPorDia55 ?? ""}
                          onChange={(e) =>
                            setCapacity(stage.id, { taxaPorDia55: num(e.target.value) })
                          }
                          className="h-8 w-24 ml-auto text-right tabular-nums"
                          placeholder={defaultTaxa(stage.id, "TR1P-55").toFixed(2)}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {horas > 0 ? formatInt(horas) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Horas padrão = necessidade bruta ÷ (unidades/dia/operador) × horas/dia. FTE
          necessário = horas padrão do mês ÷ horas disponíveis por operador
          ({horasPorOperadorMes.toFixed(1)} h), já descontando férias, absenteísmo,
          treinamento e utilização. FTE adicional = máx(0, teto(FTE pico − operadores
          atuais)). Recursos compartilhados somam a carga de todos os modelos e etapas
          antes da comparação. Defaults: stentless 2 un/dia/op, Inner 1 un/dia/op, Full
          1,5 operador-dia (45) e 2,5 operador-dia (55).
        </p>
      </div>
    </div>
  );
}
