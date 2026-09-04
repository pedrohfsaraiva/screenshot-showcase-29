import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScenario } from "@/state/ScenarioContext";


export function BomPage() {
  const { state, setBomQty } = useScenario();
  const matById = new Map(state.materials.map((m) => [m.id, m]));
  const [tamanho, setTamanho] = useState<string>("todos");

  const linhas = state.bom
    .map((line, i) => ({ line, i }))
    .filter(
      ({ line }) =>
        tamanho === "todos" || !line.modelId || line.modelId === tamanho,
    );

  return (
    <div>
      <PageHeader
        title="BOM · Estrutura de Produto"
        subtitle="Quantidades marcadas como DADO A CONFIRMAR não podem ser tratadas como aprovadas para compra."
        actions={
          <Select value={tamanho} onValueChange={setTamanho}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tamanhos</SelectItem>
              {state.products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pai</TableHead>
                  <TableHead>Filho</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Qtd por válvula</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map(({ line, i }) => {
                  const mat = matById.get(line.childId);
                  const provisorio = line.qtyPer === null;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{line.parentId}</TableCell>
                      <TableCell>{mat?.descricao ?? line.childId}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.modelId ?? "Ambos"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {line.stageId}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.qtyPer ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBomQty(i, v === "" ? null : Number(v));
                          }}
                          className="h-8 w-24 ml-auto text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mat?.unidade ?? "—"}
                      </TableCell>
                      <TableCell>
                        {provisorio ? (
                          <ProvisionalBadge />
                        ) : (
                          <span className="text-xs text-success">Definido</span>
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
