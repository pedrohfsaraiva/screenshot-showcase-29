import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScenario } from "@/state/ScenarioContext";
import { useRendimentos } from "@/hooks/useRendimentos";
import {
  ETAPA_RTY,
  ETAPA_TO_STAGE,
  LIMITE_DIAS_DEFASAGEM,
  isDefasado,
  mapRendimentos,
} from "@/lib/rendimentos";

export const Route = createFileRoute("/qualidade")({
  head: () => ({
    meta: [
      { title: "Qualidade dos Dados · Topaz MRP" },
      { name: "description", content: "Verificações que impedem classificar dados como 'pronto para compra'." },
    ],
  }),
  component: QualidadePage,
});

function QualidadePage() {
  const { state } = useScenario();
  const { rows, loading, error } = useRendimentos();

  const mapeados = mapRendimentos(rows);
  const stagesComBanco = new Set(mapeados.map((m) => m.stageId));

  const findings: { severidade: "alta" | "media"; mensagem: string }[] = [];

  state.yields.forEach((y) => {
    if (y.valor === null) {
      const stage = state.stages.find((s) => s.id === y.stageId);
      findings.push({
        severidade: "alta",
        mensagem: `Yield provisório na etapa "${stage?.nome ?? y.stageId}"`,
      });
    }
  });
  state.materials.forEach((m) => {
    if (m.custoCentavos === null) {
      findings.push({ severidade: "media", mensagem: `Custo unitário ausente: ${m.descricao}` });
    }
    if (m.leadTimeMeses === null) {
      findings.push({ severidade: "media", mensagem: `Lead time ausente: ${m.descricao}` });
    }
  });
  state.bom.forEach((b) => {
    if (b.qtyPer === null) {
      findings.push({
        severidade: "alta",
        mensagem: `Quantidade BOM provisória: ${b.parentId} → ${b.childId}${b.modelId ? ` (${b.modelId})` : ""}`,
      });
    }
  });

  rows.forEach((r) => {
    if (r.rendimento === null) {
      findings.push({
        severidade: "alta",
        mensagem: `Sem rendimento importado no banco: ${r.identificacao} (${r.etapa_correspondente})`,
      });
      return;
    }
    if (isDefasado(r)) {
      findings.push({
        severidade: "alta",
        mensagem: `Pendente/Desatualizado (${r.dias_desde_atualizacao} dias > ${LIMITE_DIAS_DEFASAGEM}): ${r.identificacao}`,
      });
    }
    const etapa = r.etapa_correspondente.trim();
    if (!ETAPA_TO_STAGE[etapa] && etapa !== ETAPA_RTY) {
      findings.push({
        severidade: "media",
        mensagem: `Componente do banco sem etapa correspondente na rota: ${r.identificacao} → "${etapa}"`,
      });
    }
  });
  state.stages
    .filter((st) => st.ativo && Object.values(ETAPA_TO_STAGE).includes(st.id))
    .forEach((st) => {
      if (!stagesComBanco.has(st.id)) {
        findings.push({
          severidade: "media",
          mensagem: `Etapa mapeada no banco mas ainda sem rendimento aplicável: ${st.nome}`,
        });
      }
    });
  if (error) {
    findings.push({ severidade: "alta", mensagem: `Falha ao ler o banco de rendimentos: ${error}` });
  }

  return (
    <div>
      <PageHeader
        title="Qualidade dos Dados"
        subtitle={`Inclui a base de rendimentos do banco (limite de defasagem: ${LIMITE_DIAS_DEFASAGEM} dias).${loading ? " Carregando rendimentos…" : ""}`}
      />
      <div className="p-6 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {findings.length === 0 ? (
                <span className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" /> Nenhum problema encontrado
                </span>
              ) : (
                <span className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" /> {findings.length} pendência
                  {findings.length > 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {findings.map((f, i) => (
                <li key={i} className="py-2 flex items-center gap-3">
                  <span
                    className={
                      f.severidade === "alta"
                        ? "h-2 w-2 rounded-full bg-destructive"
                        : "h-2 w-2 rounded-full bg-warning"
                    }
                  />
                  <span className="text-sm">{f.mensagem}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
