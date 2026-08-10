import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RendimentoStatusRow } from "@/lib/rendimentos";

/** Carrega a visão de rendimentos + status de defasagem do banco. */
export function useRendimentos() {
  const [rows, setRows] = useState<RendimentoStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("vw_rendimentos_status")
      .select("*")
      .order("id_componente");
    if (err) setError(err.message);
    else setError(null);
    setRows((data as RendimentoStatusRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}
