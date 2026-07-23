import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
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

export const Route = createFileRoute("/materiais")({
  head: () => ({
    meta: [
      { title: "Materiais · Topaz MRP" },
      {
        name: "description",
        content: "Cadastro de materiais, embalagens e consumíveis.",
      },
    ],
  }),
  component: MateriaisPage,
});

function MateriaisPage() {
  const { state, setMaterialField } = useScenario();
  return (
    <div>
      <PageHeader
        title="Materiais"
        subtitle="Cadastro mestre. Edite custo unitário (R$) e lead time (h) direto na tabela."
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Custo unit. (R$)</TableHead>
                  <TableHead className="text-right">Lead time (meses)</TableHead>
                  <TableHead className="text-right">MOQ</TableHead>
                  <TableHead className="text-right">Múltiplo</TableHead>
                  <TableHead>Reutilizável</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.materials.map((m) => {
                  const provisorio =
                    m.custoCentavos === null || m.leadTimeMeses === null;
                  const custoReais =
                    m.custoCentavos === null ? "" : (m.custoCentavos / 100).toString();
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.descricao}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.categoria}
                      </TableCell>
                      <TableCell>{m.unidade}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={custoReais}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMaterialField(
                              m.id,
                              "custoCentavos",
                              v === "" ? null : Math.round(Number(v) * 100),
                            );
                          }}
                          className="h-8 w-28 ml-auto text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={m.leadTimeMeses ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMaterialField(
                              m.id,
                              "leadTimeMeses",
                              v === "" ? null : Number(v),
                            );
                          }}
                          className="h-8 w-20 ml-auto text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.loteMinimo}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.multiploCompra}
                      </TableCell>
                      <TableCell>{m.reutilizavel ? "Sim" : "Não"}</TableCell>
                      <TableCell>
                        {provisorio ? (
                          <ProvisionalBadge />
                        ) : (
                          <span className="text-xs text-success">Completo</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
