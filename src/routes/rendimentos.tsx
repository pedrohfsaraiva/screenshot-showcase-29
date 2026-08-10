import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Upload, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/rendimentos")({
  head: () => ({
    meta: [
      { title: "Rendimentos · Qualidade de Dados · Topaz MRP" },
      {
        name: "description",
        content:
          "Base de rendimentos por componente com importação CSV, higienização automática e alerta de defasagem acima de 30 dias.",
      },
      { property: "og:title", content: "Rendimentos · Topaz MRP" },
      {
        property: "og:description",
        content:
          "Mapeamento de componentes, importação de rendimentos e monitoramento de defasagem de dados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RendimentosPage,
});

interface StatusRow {
  id_componente: number;
  identificacao: string;
  etapa_correspondente: string;
  tamanho: string;
  nome_indicador: string | null;
  rendimento: number | null;
  data_atualizacao: string | null;
  dias_desde_atualizacao: number | null;
  status_dados: string;
}

const LIMITE_DIAS = 30;

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(sep);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function toNumber(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round((n > 1 ? n / 100 : n) * 10000) / 10000;
}

function RendimentosPage() {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("vw_rendimentos_status")
      .select("*")
      .order("id_componente");
    if (error) setMsg(`Erro ao carregar: ${error.message}`);
    setRows((data as StatusRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.identificacao.toLowerCase().includes(q) ||
        r.etapa_correspondente.toLowerCase().includes(q) ||
        r.tamanho.toLowerCase().includes(q),
    );
  }, [rows, busca]);

  const desatualizados = rows.filter((r) => r.status_dados !== "Atualizado").length;

  async function importar(file: File) {
    setMsg(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    const payload = parsed
      .map((r) => ({
        id_componente: Number(r["id_componente"] ?? r["id"]),
        nome_indicador: (r["nome_indicador"] ?? r["indicador"] ?? "").trim(),
        rendimento: toNumber(r["rendimento"] ?? ""),
        data_atualizacao:
          (r["data_atualizacao"] ?? "").trim() ||
          new Date().toISOString().slice(0, 10),
      }))
      .filter(
        (r): r is typeof r & { rendimento: number } =>
          Number.isInteger(r.id_componente) &&
          r.nome_indicador.length > 0 &&
          r.rendimento !== null,
      );

    if (payload.length === 0) {
      setMsg(
        "Nenhuma linha válida. Cabeçalhos esperados: id_componente, nome_indicador, rendimento, data_atualizacao.",
      );
      return;
    }
    const { error } = await supabase.from("fato_rendimentos").insert(payload);
    if (error) setMsg(`Erro na importação: ${error.message}`);
    else setMsg(`${payload.length} registro(s) importado(s) com sucesso.`);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Rendimentos por Componente"
        subtitle="Dimensão estática de componentes × fatos de rendimento importados por CSV. Etapas 11.A e 11.B permanecem desmembradas."
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
          </div>
        }
      />

      <div className="space-y-6 px-8 pb-10 pt-8">
        <div className="grid gap-5 sm:grid-cols-3">
          <Kpi label="Componentes mapeados" value={String(rows.length)} />
          <Kpi
            label="Pendentes / Desatualizados"
            value={String(desatualizados)}
            danger={desatualizados > 0}
          />
          <Kpi label="Limite de defasagem" value={`${LIMITE_DIAS} dias`} />
        </div>

        {msg ? (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            {msg}
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-4 p-5">
            <Input
              placeholder="Buscar por componente, etapa ou tamanho…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-sm"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-right">ID</th>
                    <th className="px-3 py-2 text-left">Identificação</th>
                    <th className="px-3 py-2 text-left">Etapa correspondente</th>
                    <th className="px-3 py-2 text-left">Tamanho</th>
                    <th className="px-3 py-2 text-left">Indicador</th>
                    <th className="px-3 py-2 text-right">Rendimento</th>
                    <th className="px-3 py-2 text-right">Atualização</th>
                    <th className="px-3 py-2 text-right">Dias</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                        Carregando…
                      </td>
                    </tr>
                  ) : (
                    filtradas.map((r) => {
                      const ok = r.status_dados === "Atualizado";
                      return (
                        <tr key={r.id_componente} className="border-b border-border/50">
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {r.id_componente}
                          </td>
                          <td className="px-3 py-2 font-medium">{r.identificacao}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.etapa_correspondente}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                              {r.tamanho}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.nome_indicador ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.rendimento === null
                              ? "—"
                              : `${(Number(r.rendimento) * 100).toFixed(2)}%`}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.data_atualizacao
                              ? new Date(`${r.data_atualizacao}T00:00:00`).toLocaleDateString(
                                  "pt-BR",
                                )
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.dias_desde_atualizacao ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                ok
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {ok ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {r.status_dados}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV esperado: <code>id_componente;nome_indicador;rendimento;data_atualizacao</code>.
              Espaços em branco são removidos (TRIM) e o rendimento é limitado a 4 casas decimais na
              gravação.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div
          className={`mt-1 text-2xl font-semibold tabular-nums ${
            danger ? "text-destructive" : "text-foreground"
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
