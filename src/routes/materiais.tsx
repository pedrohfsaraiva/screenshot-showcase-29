import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatInt } from "@/lib/format";
import { useScenario } from "@/state/ScenarioContext";

export const Route = createFileRoute("/materiais")({
  head: () => ({
    meta: [
      { title: "Materiais · Topaz MRP" },
      { name: "description", content: "Cadastro de materiais, embalagens e consumíveis." },
    ],
  }),
  component: MateriaisPage,
});

function MateriaisPage() {
  const { state } = useScenario();
  return (
    <div>
      <PageHeader
        title="Materiais"
        subtitle="Cadastro mestre. Custos e lead times em branco bloqueiam classificação 'pronto para compra'."
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
                  <TableHead className="text-right">Custo unit.</TableHead>
                  <TableHead className="text-right">Lead time (m)</TableHead>
                  <TableHead className="text-right">MOQ</TableHead>
                  <TableHead className="text-right">Múltiplo</TableHead>
                  <TableHead>Reutilizável</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.materials.map((m) => {
                  const provisorio = m.custoCentavos === null || m.leadTimeMeses === null;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.descricao}</TableCell>
                      <TableCell className="text-muted-foreground">{m.categoria}</TableCell>
                      <TableCell>{m.unidade}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(m.custoCentavos)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInt(m.leadTimeMeses)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.loteMinimo}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.multiploCompra}</TableCell>
                      <TableCell>{m.reutilizavel ? "Sim" : "Não"}</TableCell>
                      <TableCell>{provisorio ? <ProvisionalBadge /> : <span className="text-xs text-success">Completo</span>}</TableCell>
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
