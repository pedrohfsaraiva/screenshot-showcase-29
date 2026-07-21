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
  PackageSearch,
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
import { formatInt, formatPct, formatPeriod } from "@/lib/format";
import type { ModelId } from "@/domain/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Topaz MRP" },
      {
        name: "description",
        content:
          "KPIs de demanda, alertas de estoque crítico, RTY e qualidade dos dados.",
      },
    ],
  }),
  component: Dashboard,
});

type ModelFilter = "all" | ModelId;
type LoteFilter = "all" | "piloto" | "producao" | "validacao";

// Hash determinístico simples para simular saldo projetado por material.
function hashRatio(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0.05 a 0.85
  return 0.05 + (Math.abs(h) % 800) / 1000;
}

function stockTone(ratio: number) {
  if (ratio < 0.2)
    return {
      badge: "Crítico",
      text: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/40",
      bar: "bg-destructive",
    };
  if (ratio < 0.4)
    return {
      badge: "Atenção",
      text: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/40",
      bar: "bg-warning",
    };
  return {
    badge: "Saudável",
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/40",
    bar: "bg-success",
  };
}

function Dashboard() {
  const { state, setViewMode } = useScenario();

  // -------- Filtros reativos (estado local, não persistido) --------
  const [modelo, setModelo] = useState<ModelFilter>("all");
  const [lote, setLote] = useState<LoteFilter>("all");
  const [dataInicio, setDataInicio] = useState<string>(state.periodos[0] ?? "");
  const [dataFim, setDataFim] = useState<string>(
    state.periodos[state.periodos.length - 1] ?? "",
  );

  const periodosFiltrados = useMemo(() => {
    const ini = state.periodos.indexOf(dataInicio);
    const fim = state.periodos.indexOf(dataFim);
    if (ini === -1 || fim === -1 || ini > fim) return state.periodos;
    return state.periodos.slice(ini, fim + 1);
  }, [state.periodos, dataInicio, dataFim]);

  // Multiplicador de lote (piloto reduz demanda, produção mantém).
  const fatorLote = lote === "piloto" ? 0.15 : lote === "validacao" ? 0.35 : 1;

  const demandaFiltrada = useMemo(() => {
    return state.demand.filter(
      (d) =>
        (modelo === "all" || d.modelId === modelo) &&
        periodosFiltrados.includes(d.periodo),
    );
  }, [state.demand, modelo, periodosFiltrados]);

  const demandTotals = useMemo(() => {
    return periodosFiltrados.map((p) => {
      const dm = demandaFiltrada
        .filter((d) => d.periodo === p)
        .reduce((acc, d) => acc + d.demanda, 0);
      return { periodo: p, demanda: Math.round(dm * fatorLote) };
    });
  }, [demandaFiltrada, periodosFiltrados, fatorLote]);

  const totalDemandaHorizonte = demandTotals.reduce((a, b) => a + b.demanda, 0);

  // -------- RTY: mantém a lógica atual (yields aprovados das etapas ativas) --------
  const rty = useMemo(
    () =>
      rolledThroughputYield(
        state.yields
          .filter((y) => state.stages.find((s) => s.id === y.stageId)?.ativo)
          .map((y) => y.valor),
      ),
    [state.yields, state.stages],
  );

  const provisorios = state.yields.filter((y) => y.valor === null).length;
  const totalYields = state.yields.length;

  // -------- Explosão reversa (lógica intacta) --------
  const explosao = useMemo(
    () => reverseExplode(totalDemandaHorizonte, state.stages, state.yields),
    [totalDemandaHorizonte, state.stages, state.yields],
  );

  // -------- Cards de estoque crítico: necessidade x saldo projetado simulado --------
  const stockCards = useMemo(() => {
    // Consolida BOM por materialId respeitando o filtro de modelo.
    const needByMaterial = new Map<string, number>();
    for (const l of state.bom) {
      if (!l.qtyPer) continue;
      if (l.modelId && modelo !== "all" && l.modelId !== modelo) continue;
      // Quando a linha é por modelo, aplica só sobre a demanda daquele modelo.
      const demandaBase = l.modelId
        ? demandaFiltrada
            .filter((d) => d.modelId === l.modelId)
            .reduce((a, b) => a + b.demanda, 0) * fatorLote
        : totalDemandaHorizonte;
      const nec = demandaBase * l.qtyPer;
      needByMaterial.set(
        l.childId,
        (needByMaterial.get(l.childId) ?? 0) + nec,
      );
    }

    const cards = state.materials
      .filter((m) => needByMaterial.has(m.id))
      .map((m) => {
        const ideal = Math.max(1, Math.ceil(needByMaterial.get(m.id) ?? 0));
        // Saldo projetado: mistura de hash determinístico + estoque de segurança.
        const projetado = Math.round(
          ideal * hashRatio(m.id + modelo + lote) + m.estoqueSeguranca,
        );
        const ratio = ideal > 0 ? projetado / ideal : 1;
        return { material: m, ideal, projetado, ratio };
      })
      .sort((a, b) => a.ratio - b.ratio);

    return cards.slice(0, 6);
  }, [state.bom, state.materials, demandaFiltrada, totalDemandaHorizonte, modelo, lote, fatorLote]);

  const criticos = stockCards.filter((c) => c.ratio < 0.2).length;

  const chartData = useMemo(() => {
    if (state.viewMode === "anual") {
      const buckets: { label: string; demanda: number }[] = [];
      demandTotals.forEach((d, i) => {
        const idx = Math.floor(i / 12);
        if (!buckets[idx]) buckets[idx] = { label: `Y${idx + 1}`, demanda: 0 };
        buckets[idx].demanda += d.demanda;
      });
      return buckets.map((b) => ({ periodo: b.label, demanda: b.demanda }));
    }
    return demandTotals.map((d) => ({
      periodo: formatPeriod(d.periodo),
      demanda: d.demanda,
    }));
  }, [demandTotals, state.viewMode]);

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        subtitle="Painel executivo com alertas de estoque, RTY e projeção de demanda."
        actions={
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
        }
      />

      {/* -------- Barra de filtros reativos -------- */}
      <div className="px-6 pt-2">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

              <FilterField label="Lote">
                <Select value={lote} onValueChange={(v) => setLote(v as LoteFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os lotes</SelectItem>
                    <SelectItem value="piloto">Piloto (15%)</SelectItem>
                    <SelectItem value="validacao">Validação (35%)</SelectItem>
                    <SelectItem value="producao">Produção (100%)</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Data inicial">
                <Select value={dataInicio} onValueChange={setDataInicio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.periodos.map((p) => (
                      <SelectItem key={p} value={p}>
                        {formatPeriod(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Data final">
                <Select value={dataFim} onValueChange={setDataFim}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.periodos.map((p) => (
                      <SelectItem key={p} value={p}>
                        {formatPeriod(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -------- Cards de estoque crítico -------- */}
      <div className="px-6 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Estoque crítico
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {criticos > 0
              ? `${criticos} insumo(s) em nível crítico`
              : "Todos os insumos monitorados dentro do previsto"}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stockCards.map((c) => {
            const tone = stockTone(c.ratio);
            const pct = Math.min(100, Math.round(c.ratio * 100));
            return (
              <Card
                key={c.material.id}
                className={cn("border transition-colors", tone.border, tone.bg)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {c.material.descricao}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {c.material.categoria} · {c.material.unidade}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                        tone.text,
                        tone.bg,
                      )}
                    >
                      {tone.badge}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-4 tabular-nums">
                    <span className={cn("text-2xl font-semibold", tone.text)}>
                      {pct}%
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      <span className="block">
                        Projetado:{" "}
                        <span className="text-foreground">{formatInt(c.projetado)}</span>
                      </span>
                      <span className="block">
                        Ideal:{" "}
                        <span className="text-foreground">{formatInt(c.ideal)}</span>
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full transition-all", tone.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {stockCards.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              Sem demanda cadastrada — nenhum insumo para monitorar.
            </p>
          ) : null}
        </div>
      </div>

      {/* -------- KPIs -------- */}
      <div className="p-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Demanda no horizonte"
          value={formatInt(totalDemandaHorizonte)}
          hint={`${periodosFiltrados.length} períodos · ${modelo === "all" ? "todos os modelos" : modelo}`}
        />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="RTY acumulado"
          value={rty === null ? "—" : formatPct(rty, 2)}
          hint={
            rty === null
              ? "Yields provisórios impedem o cálculo"
              : "Produto dos gates ativos"
          }
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

      {/* -------- Gráficos -------- */}
      <div className="px-6 pb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Demanda projetada · válvulas finais
            </CardTitle>
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
            {totalDemandaHorizonte === 0 ? (
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
