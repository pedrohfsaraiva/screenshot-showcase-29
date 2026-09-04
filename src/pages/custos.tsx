import { PageHeader } from "@/components/PageHeader";
import { ProvisionalBadge } from "@/components/ProvisionalBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export function CustosPage() {
  return (
    <div>
      <PageHeader title="Custos" subtitle="Módulo em preparação para a próxima iteração." />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Custeio unitário e waterfall <ProvisionalBadge label="EM CONSTRUÇÃO" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Custos serão calculados em centavos inteiros (BRL) com formatação{" "}
            <code>Intl.NumberFormat("pt-BR")</code>. Cada custo unitário terá vigência,
            fornecedor, fonte e status de aprovação — sem isso, o item permanece bloqueado
            para compra.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
