import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { AlertTriangle, CheckCircle2, Factory, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScenario } from "@/state/ScenarioContext";
import { rolledThroughputYield } from "@/engine/yield";
import { reverseExplode } from "@/engine/reverseExplosion";
import { formatInt, formatPct, formatPeriod } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Topaz MRP" },
      { name: "description", content: "KPIs de demanda, RTY, gargalos e qualidade dos dados." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, setViewMode } = useScenario();

  const rty = useMemo(
    () => rolledThroughputYield(state.yields.filter((y) => state.stages.find((s) => s.id === y.stageId)?.ativo).map((y) => y.valor)),
    [state.yields, state.stages],
  );

  const provisorios = state.yields.filter((y) => y.valor === null).length;
  const totalYields = state.yields.length;

  const demandTotals = useMemo(() => {
    // Aggrega por período (soma dos dois modelos)
    return state.periodos.map((p) => {
      const dm = state.demand
        .filter((d) => d.periodo === p)
        .reduce((acc, d) => acc + d.demanda, 0);
      return { periodo: p, demanda: dm };
    });
  }, [state.demand, state.periodos]);

  // Necessidade de pericárdio bruto (estimativa via reverseExplode global sobre demanda total 3Y)
  const totalDemanda3Y = demandTotals.reduce((a, b) => a + b.demanda, 0);
  const explosao = useMemo(
    () => reverseExplode(totalDemanda3Y, state.stages, state.yields),
    [totalDemanda3Y, state.stages, state.yields],
  );

  const chartData = useMemo(() => {
    if (state.viewMode === "anual") {
      const buckets = [
        { label: "Y1", demanda: 0 },
        { label: "Y2", demanda: 0 },
        { label: "Y3", demanda: 0 },
      ];
      demandTotals.forEach((d, i) => {
        buckets[Math.floor(i / 12)].demanda += d.demanda;
      });
      return buckets.map((b) => ({ periodo: b.label, demanda: b.demanda }));
    }
    return demandTotals.map((d) => ({ periodo: formatPeriod(d.periodo), demanda: d.demanda }));
  }, [demandTotals, state.viewMode]);

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        subtitle="Painel executivo. RTY refere-se apenas às etapas ativas com yield aprovado."
        actions={
          <Select value={state.viewMode} onValueChange={(v) => setViewMode(v as "mensal" | "anual")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mensal">Visão mensal</SelectItem>
              <SelectItem value="anual">Y1 · Y2 · Y3</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="p-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Demanda 3 anos"
          value={formatInt(totalDemanda3Y)}
          hint="Somatório TR1P-45 + TR1P-55"
        />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="RTY acumulado"
          value={rty === null ? "—" : formatPct(rty, 2)}
          hint={rty === null ? "Yields provisórios impedem o cálculo" : "Produto dos gates ativos"}
          alert={rty === null}
        />
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

      <div className="px-6 pb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demanda projetada · válvulas finais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
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
            </div>
            {totalDemanda3Y === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Ainda não há demanda cadastrada. Adicione valores em Cenários → Demanda.
              </p>
            ) : null}
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
                <BarChart data={explosao.reconciliacao.slice(0, 10)}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="stageName"
                    stroke="var(--color-muted-foreground)"
                    fontSize={10}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entradaBruta" name="Entrada bruta" fill="var(--color-chart-1)" />
                  <Bar dataKey="saidaAprovada" name="Saída aprovada" fill="var(--color-chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
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
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
