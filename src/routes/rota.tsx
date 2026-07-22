import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Check, CircleDot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import { useScenario } from "@/state/ScenarioContext";
import { reverseExplode } from "@/engine/reverseExplosion";
import { rolledThroughputYield } from "@/engine/yield";
import { formatInt, formatPct } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { ModelId, YieldParameter } from "@/domain/types";

export const Route = createFileRoute("/rota")({
  head: () => ({
    meta: [
      { title: "Rota · Visual Pipeline · Topaz MRP" },
      {
        name: "description",
        content:
          "Pipeline visual de manufatura Topaz. Ajuste yields por gate e por modelo e veja o impacto em tempo real na necessidade bruta e no RTY.",
      },
    ],
  }),
  component: RotaPage,
});

function RotaPage() {
  const { state, setYieldValue, setStageActive } = useScenario();

  const demandaPorModelo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of state.products) {
      map[p.id] = state.demand
        .filter((d) => d.modelId === p.id)
        .reduce((a, d) => a + d.demanda, 0);
    }
    return map;
  }, [state.demand, state.products]);

  const totalDemanda = Object.values(demandaPorModelo).reduce((a, b) => a + b, 0);

  const explosaoPorModelo = useMemo(() => {
    const out: Record<string, ReturnType<typeof reverseExplode>> = {};
    for (const p of state.products) {
      const d = demandaPorModelo[p.id] || 1000;
      out[p.id] = reverseExplode(d, state.stages, state.yields, p.id);
    }
    return out;
  }, [state.products, state.stages, state.yields, demandaPorModelo]);

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

  const stagesSorted = [...state.stages].sort((a, b) => a.ordem - b.ordem);

  return (
    <div>
      <PageHeader
        title="Rota de Manufatura · Pipeline"
        subtitle={
          totalDemanda > 0
            ? `Necessidade calculada sobre a demanda cadastrada (${formatInt(totalDemanda)} válvulas).`
            : "Referência de 1.000 válvulas por modelo (edite a demanda em Cenários para usar valores reais)."
        }
        actions={
          <div className="flex items-center gap-2">
            {state.products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs"
              >
                <span className="text-muted-foreground">RTY {p.id}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {rtyPorModelo[p.id] === null ? "—" : formatPct(rtyPorModelo[p.id]!, 2)}
                </span>
              </div>
            ))}
          </div>
        }
      />
      <div className="p-6 max-w-5xl">
        <ol className="relative border-l-2 border-primary/40 ml-4 space-y-4">
          {stagesSorted.map((stage) => {
            const yieldsStage = state.yields.filter((y) => y.stageId === stage.id);
            const provisorio = yieldsStage.some(
              (y) => y.valor === null || y.valor <= 0,
            );
            return (
              <li key={stage.id} className="ml-6 relative">
                <span className="absolute -left-[35px] top-4 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background bg-primary text-primary-foreground text-[10px] font-bold">
                  {stage.ordem}
                </span>
                <Card
                  className={
                    stage.ativo
                      ? provisorio
                        ? "border-warning/40"
                        : "border-border"
                      : "opacity-60"
                  }
                >
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{stage.nome}</h3>
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {stage.tipo}
                          </span>
                          {provisorio ? <ProvisionalBadge label="YIELD A CONFIRMAR" /> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Ativo</span>
                        <Switch
                          checked={stage.ativo}
                          onCheckedChange={(v) => setStageActive(stage.id, v)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {state.products.map((p) => {
                        const y = yieldsStage.find((yy) => yy.modelId === p.id);
                        const rec = explosaoPorModelo[p.id]?.reconciliacao.find(
                          (r) => r.stageId === stage.id,
                        );
                        return (
                          <ModelYieldRow
                            key={p.id}
                            modelId={p.id}
                            modelName={p.nome}
                            y={y}
                            rec={rec}
                            active={stage.ativo}
                            onChange={(v) => setYieldValue(stage.id, p.id, v)}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function ModelYieldRow({
  modelId,
  modelName,
  y,
  rec,
  active,
  onChange,
}: {
  modelId: ModelId;
  modelName: string;
  y?: YieldParameter;
  rec?: {
    entradaBruta: number;
    saidaAprovada: number;
    perdaTotal: number;
  };
  active: boolean;
  onChange: (valor: number | null) => void;
}) {
  const val = y?.valor;
  const pct = val !== null && val !== undefined ? Math.round(val * 100) : 0;
  const provisorio = val === null || val === undefined;

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {modelId}
          </span>
          <span className="text-xs text-muted-foreground">{modelName}</span>
        </div>
        {provisorio ? (
          <Button size="sm" variant="outline" onClick={() => onChange(0.9)}>
            Iniciar em 90%
          </Button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-success">
            <Check className="h-3 w-3" />
            <span>Yield definido</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Metric label="Entrada" value={rec ? formatInt(rec.entradaBruta) : "—"} emphasis />
        <Metric label="Saída" value={rec ? formatInt(rec.saidaAprovada) : "—"} />
        <Metric
          label="Perda"
          value={rec ? formatInt(rec.perdaTotal) : "—"}
          variant={rec && rec.perdaTotal > 0 ? "warning" : "muted"}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <CircleDot className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <Slider
            value={[pct]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => onChange(v / 100)}
            disabled={!active}
          />
        </div>
        <div className="w-14 text-right font-semibold tabular-nums text-sm">
          {provisorio ? "—" : `${pct}%`}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  variant = "default",
  emphasis,
}: {
  label: string;
  value: string;
  variant?: "default" | "warning" | "muted";
  emphasis?: boolean;
}) {
  const color =
    variant === "warning"
      ? "text-warning"
      : variant === "muted"
        ? "text-muted-foreground"
        : emphasis
          ? "text-primary"
          : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xs font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
