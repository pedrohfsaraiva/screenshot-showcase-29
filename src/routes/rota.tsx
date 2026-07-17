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

export const Route = createFileRoute("/rota")({
  head: () => ({
    meta: [
      { title: "Rota · Visual Pipeline · Topaz MRP" },
      {
        name: "description",
        content:
          "Pipeline visual de manufatura Topaz. Ajuste yields por gate e veja o impacto em tempo real na necessidade bruta e no RTY.",
      },
    ],
  }),
  component: RotaPage,
});

function RotaPage() {
  const { state, setYieldValue, setStageActive } = useScenario();

  const totalDemanda = useMemo(
    () => state.demand.reduce((a, b) => a + b.demanda, 0),
    [state.demand],
  );
  const demandaReferencia = totalDemanda > 0 ? totalDemanda : 1000;

  const explosao = useMemo(
    () => reverseExplode(demandaReferencia, state.stages, state.yields),
    [demandaReferencia, state.stages, state.yields],
  );

  const rty = useMemo(
    () =>
      rolledThroughputYield(
        state.yields
          .filter((y) => state.stages.find((s) => s.id === y.stageId)?.ativo)
          .map((y) => y.valor),
      ),
    [state.yields, state.stages],
  );

  const stagesSorted = [...state.stages].sort((a, b) => a.ordem - b.ordem);

  return (
    <div>
      <PageHeader
        title="Rota de Manufatura · Pipeline"
        subtitle={
          totalDemanda > 0
            ? `Necessidade calculada sobre a demanda cadastrada (${formatInt(totalDemanda)} válvulas).`
            : "Referência de 1.000 válvulas (edite a demanda em Cenários para usar valores reais)."
        }
        actions={
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">RTY global</span>
            <span className="text-base font-semibold tabular-nums">
              {rty === null ? "—" : formatPct(rty, 2)}
            </span>
          </div>
        }
      />
      <div className="p-6 max-w-5xl">
        <ol className="relative border-l-2 border-primary/40 ml-4 space-y-4">
          {stagesSorted.map((stage, idx) => {
            const y = state.yields.find((yy) => yy.stageId === stage.id);
            const rec = explosao.reconciliacao.find((r) => r.stageId === stage.id);
            const provisorio = !y || y.valor === null;
            const pct = y?.valor !== null && y?.valor !== undefined ? Math.round(y.valor * 100) : 0;
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
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{stage.nome}</h3>
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {stage.tipo}
                          </span>
                          {provisorio ? <ProvisionalBadge label="YIELD A CONFIRMAR" /> : null}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                          <Metric
                            label="Entrada bruta"
                            value={rec ? formatInt(rec.entradaBruta) : "—"}
                            emphasis={idx === 0}
                          />
                          <Metric
                            label="Saída aprovada"
                            value={rec ? formatInt(rec.saidaAprovada) : "—"}
                          />
                          <Metric
                            label="Perda"
                            value={rec ? formatInt(rec.perdaTotal) : "—"}
                            variant={rec && rec.perdaTotal > 0 ? "warning" : "muted"}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Ativo</span>
                          <Switch
                            checked={stage.ativo}
                            onCheckedChange={(v) => setStageActive(stage.id, v)}
                          />
                        </div>
                        {y?.valor === null ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setYieldValue(stage.id, 0.9)}
                          >
                            Iniciar em 90%
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-success">
                            <Check className="h-3 w-3" />
                            <span>Yield definido</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <CircleDot className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <Slider
                          value={[pct]}
                          min={50}
                          max={100}
                          step={1}
                          onValueChange={([v]) => setYieldValue(stage.id, v / 100)}
                          disabled={!stage.ativo}
                        />
                      </div>
                      <div className="w-16 text-right font-semibold tabular-nums text-sm">
                        {y?.valor === null ? "—" : `${pct}%`}
                      </div>
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
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
