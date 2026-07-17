import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScenario } from "@/state/ScenarioContext";
import { runMrp } from "@/engine/mrp";
import { formatInt, formatPeriod } from "@/lib/format";

export const Route = createFileRoute("/mrp")({
  head: () => ({
    meta: [
      { title: "MRP Líquida · Topaz MRP" },
      { name: "description", content: "MRP líquida mensal com lot-sizing, lead time e exceções." },
    ],
  }),
  component: MrpPage,
});

function MrpPage() {
  const { state } = useScenario();
  const [materialId, setMaterialId] = useState(state.materials[0]?.id ?? "");

  const material = state.materials.find((m) => m.id === materialId);

  // Demanda bruta por período: para simplificar, usa consumo unitário via BOM.
  // Para material final: usa a própria demanda das válvulas.
  const rows = useMemo(() => {
    if (!material) return [];

    const bomLine = state.bom.find((b) => b.childId === material.id);
    const qtyPer = bomLine?.qtyPer ?? 1;

    const demandaBruta = state.periodos.map((p) => {
      const somaValvulas = state.demand
        .filter((d) => d.periodo === p)
        .reduce((a, d) => a + d.demanda, 0);
      return Math.ceil(somaValvulas * qtyPer);
    });

    return runMrp({
      periodos: state.periodos,
      demandaBruta,
      recebimentosProgramados: state.periodos.map(() => 0),
      saldoInicial: 0,
      estoqueSeguranca: material.estoqueSeguranca,
      leadTimePeriodos: material.leadTimeMeses ?? 0,
      policy: material.loteMinimo > 0 || material.multiploCompra > 1 ? "moq_multiplo" : "lot_for_lot",
      moq: material.loteMinimo,
      multiplo: material.multiploCompra,
    });
  }, [material, state.bom, state.demand, state.periodos]);

  return (
    <div>
      <PageHeader
        title="MRP Líquida"
        subtitle="Cálculo mensal por material com base na demanda cadastrada e no consumo unitário da BOM."
        actions={
          <Select value={materialId} onValueChange={setMaterialId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecione o material" />
            </SelectTrigger>
            <SelectContent>
              {state.materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Demanda bruta</TableHead>
                  <TableHead className="text-right">Rec. programados</TableHead>
                  <TableHead className="text-right">Nec. líquida</TableHead>
                  <TableHead className="text-right">Receb. planejado</TableHead>
                  <TableHead className="text-right">Liberação planejada</TableHead>
                  <TableHead className="text-right">Disponível projetado</TableHead>
                  <TableHead>Exceções</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 36).map((r) => (
                  <TableRow key={r.periodo}>
                    <TableCell className="font-medium">{formatPeriod(r.periodo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(r.demandaBruta)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(r.recebimentosProgramados)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(r.necessidadeLiquida)}</TableCell>
                    <TableCell className="text-right tabular-nums text-primary">{formatInt(r.recebimentoPlanejado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(r.liberacaoPlanejada)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(r.disponivelProjetado)}</TableCell>
                    <TableCell className="text-warning text-xs">
                      {r.excecoes.length > 0 ? r.excecoes.join(", ") : ""}
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
