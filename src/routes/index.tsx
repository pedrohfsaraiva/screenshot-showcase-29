import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useScenario } from "@/state/ScenarioContext";
import { rolledThroughputYield } from "@/engine/yield";
import { reverseExplode } from "@/engine/reverseExplosion";
import { formatInt, formatPeriod } from "@/lib/format";
import type { ModelId } from "@/domain/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Topaz MRP" },
      {
        name: "description",
        content:
          "Painel executivo de previsão de demanda, RTY e necessidade bruta por gate.",
      },
    ],
  }),
  component: Dashboard,
});

type ModelFilter = "all" | ModelId;
type YearFilter = "all" | "Y1" | "Y2" | "Y3";

// Trunca sem arredondar para cima; usado no RTY.
function truncPct(v: number, digits: number): string {
  const factor = Math.pow(10, digits);
  const truncated = Math.trunc(v * 100 * factor) / factor;
  return `${truncated.toFixed(digits)}%`;
}

function Dashboard() {
  const { state, setViewMode } = useScenario();

  const [modelo, setModelo] = useState<ModelFilter>("all");
  const [ano, setAno] = useState<YearFilter>("all");

  const periodosFiltrados = useMemo(() => {
    if (ano === "all") return state.periodos;
    const idx = ano === "Y1" ? 0 : ano === "Y2" ? 1 : 2;
    return state.periodos.slice(idx * 12, idx * 12 + 12);
  }, [state.periodos, ano]);

  const demandaFiltrada = useMemo(() => {
    const setP = new Set(periodosFiltrados);
    return state.demand.filter(
      (d) => (modelo === "all" || d.modelId === modelo) && setP.has(d.periodo),
    );
  }, [state.demand, modelo, periodosFiltrados]);

  const demandTotals = useMemo(() => {
    return periodosFiltrados.map((p) => {
      const dm = demandaFiltrada
        .filter((d) => d.periodo === p)
        .reduce((acc, d) => acc + d.demanda, 0);
      return { periodo: p, demanda: dm };
    });
  }, [demandaFiltrada, periodosFiltrados]);

  const totalDemandaHorizonte = demandTotals.reduce((a, b) => a + b.demanda, 0);

  // RTY por modelo — nunca fazemos média entre modelos.
  const rtyPorModelo = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const p of state.products) {
      const rates = state.yields
        .filter((y) => y.modelId === p.id)
        .filter((y) => state.stages.find((s) => s.id === y.stageId)?.ativo)
        .map((y) => (y.valor !== null && y.valor > 0 ? y.valor : null));
      out[p.id] = rolledThroughputYield(rates);
    }
    return out;
  }, [state.yields, state.stages, state.products]);

  const provisorios = state.yields.filter((y) => y.valor === null).length;
  const totalYields = state.yields.length;

  const explosao = useMemo(() => {
    const stageAcc = new Map<
      string,
      {
        stageName: string;
        ordem: number;
        entradaBruta: number;
        saidaAprovada: number;
        provisorio: boolean;
      }
    >();
    let necessidadeInicial = 0;
    let temProvisorio = false;
    for (const p of state.products) {
      const d = demandaFiltrada
        .filter((x) => x.modelId === p.id)
        .reduce((a, b) => a + b.demanda, 0);
      if (d <= 0) continue;
      const exp = reverseExplode(d, state.stages, state.yields, p.id);
      necessidadeInicial += exp.necessidadeInicial;
      if (exp.temProvisorio) temProvisorio = true;
      for (const r of exp.reconciliacao) {
        const prev = stageAcc.get(r.stageId);
        if (prev) {
          prev.entradaBruta += r.entradaBruta;
          prev.saidaAprovada += r.saidaAprovada;
          prev.provisorio = prev.provisorio || r.provisorio;
        } else {
          stageAcc.set(r.stageId, {
            stageName: r.stageName,
            ordem: r.ordem,
            entradaBruta: r.entradaBruta,
            saidaAprovada: r.saidaAprovada,
            provisorio: r.provisorio,
          });
        }
      }
    }
    const reconciliacao = Array.from(stageAcc.entries())
      .map(([stageId, v]) => ({ stageId, ...v }))
      .sort((a, b) => a.ordem - b.ordem);
    return { necessidadeInicial, temProvisorio, reconciliacao };
  }, [demandaFiltrada, state.products, state.stages, state.yields]);

  const chartData = useMemo(() => {
    if (state.viewMode === "anual") {
      const buckets: { label: string; demanda: number }[] = [];
      demandTotals.forEach((d, i) => {
        const globalIdx = state.periodos.indexOf(d.periodo);
        const yr = Math.floor(globalIdx / 12);
        const label = `Y${yr + 1}`;
        const found = buckets.find((b) => b.label === label);
        if (found) found.demanda += d.demanda;
        else buckets.push({ label, demanda: d.demanda });
      });
      return buckets.map((b) => ({ periodo: b.label, demanda: b.demanda }));
    }
    return demandTotals.map((d) => ({
      periodo: formatPeriod(d.periodo),
      demanda: d.demanda,
    }));
  }, [demandTotals, state.viewMode, state.periodos]);

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        subtitle="Painel executivo · 3 anos calendário (2027 · 2028 · 2029) — previsão de necessidades."
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={state.viewMode}
              onValueChange={(v) => setViewMode(v as "mensal" | "anual")}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Visão mensal</SelectItem>
                <SelectItem value="anual">Y1 · Y2 · Y3</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/cenarios">
                <Plus className="h-4 w-4" />
                Inserir Demanda
              </Link>
            </Button>
          </div>
        }
      />

      {/* Filtros: apenas Modelo e Ano */}
      <div className="px-8 pt-4">
        <Card className="border-border/60">
          <CardContent className="p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <FilterField label="Modelo da válvula">
                <Select value={modelo} onValueChange={(v) => setModelo(v as ModelFilter)}>
                  <SelectTrigger>
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
              </FilterField>

              <FilterField label="Período">
                <Select value={ano} onValueChange={(v) => setAno(v as YearFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">3 anos (2027–2029)</SelectItem>
                    <SelectItem value="Y1">Ano 1 · 2027</SelectItem>
                    <SelectItem value="Y2">Ano 2 · 2028</SelectItem>
                    <SelectItem value="Y3">Ano 3 · 2029</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs */}
      <div className="px-8 pt-8 pb-2 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Demanda no período"
          value={formatInt(totalDemandaHorizonte)}
          hint={`${periodosFiltrados.length} meses · ${modelo === "all" ? "todos os modelos" : modelo}`}
        />
        <RtyKpi modelo={modelo} rtyPorModelo={rtyPorModelo} products={state.products} />
        <Kpi
          icon={<Factory className="h-4 w-4" />}
          label="Pericárdios estimados"
          value={formatInt(explosao.necessidadeInicial)}
          hint="Entrada da primeira etapa (estimativa)"
          alert={explosao.temProvisorio}
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Yields provisórios"
          value={`${provisorios} / ${totalYields}`}
          hint="Etapas sem valor aprovado"
          alert={provisorios > 0}
        />
      </div>

      {/* Gráficos */}
      <div className="px-8 pt-8 pb-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Demanda projetada · válvulas finais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-72">
              {totalDemandaHorizonte === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button asChild size="lg" variant="outline" className="gap-2">
                    <Link to="/cenarios">
                      <Plus className="h-4 w-4" />
                      Configurar Demanda Inicial
                    </Link>
                  </Button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" stroke="var(--color-muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="demanda"
                      stroke="var(--color-primary)"
                      fill="url(#dg)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Necessidade bruta por gate <ProvisionalBadge />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={explosao.reconciliacao
                    .filter((r) => r.entradaBruta > 0 || r.saidaAprovada > 0)
                    .slice(0, 10)
                    .map((r) => ({
                      ...r,
                      stageShort:
                        r.stageName.length > 12
                          ? r.stageName.slice(0, 12) + "…"
                          : r.stageName,
                    }))}
                >
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="stageShort"
                    stroke="var(--color-muted-foreground)"
                    fontSize={10}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                    labelFormatter={(_label, payload) =>
                      payload && payload[0]
                        ? (payload[0].payload as { stageName: string }).stageName
                        : ""
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entradaBruta" name="Entrada bruta" fill="var(--color-chart-1)" minPointSize={0} />
                  <Bar dataKey="saidaAprovada" name="Saída aprovada" fill="var(--color-chart-3)" minPointSize={0} />
                </BarChart>
              </ResponsiveContainer>
              {explosao.reconciliacao.every(
                (r) => r.entradaBruta === 0 && r.saidaAprovada === 0,
              ) ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Sem demanda para calcular necessidade por gate.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-warning/40" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-wider">{label}</span>
          <span className={alert ? "text-warning" : "text-primary"}>{icon}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums text-right">
          {value}
        </div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function RtyKpi({
  modelo,
  rtyPorModelo,
  products,
}: {
  modelo: ModelFilter;
  rtyPorModelo: Record<string, number | null>;
  products: { id: ModelId; nome: string }[];
}) {
  // Nunca exibimos média entre modelos: rotas e perdas são distintas.
  if (modelo === "all") {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-wider">RTY por modelo</span>
            <span className="text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {products.map((p) => {
              const v = rtyPorModelo[p.id];
              return (
                <div
                  key={p.id}
                  className="flex items-baseline justify-between text-sm tabular-nums"
                >
                  <span className="text-xs text-muted-foreground">{p.id}</span>
                  <span className="text-lg font-semibold">
                    {v === null ? "—" : truncPct(v, 3)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Selecione um modelo para consolidar
          </div>
        </CardContent>
      </Card>
    );
  }
  const v = rtyPorModelo[modelo];
  const alert = v === null;
  return (
    <Card className={alert ? "border-warning/40" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-wider">RTY · {modelo}</span>
          <span className={alert ? "text-warning" : "text-primary"}>
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums text-right">
          {v === null ? "—" : truncPct(v, 3)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {v === null
            ? "Yields provisórios impedem o cálculo"
            : "Produto dos gates ativos · truncado em 3 casas"}
        </div>
      </CardContent>
    </Card>
  );
}
