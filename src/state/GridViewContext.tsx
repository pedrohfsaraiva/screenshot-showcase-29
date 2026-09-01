// Contexto isolado do módulo MRP/BOM (e telas de simulação).
// NÃO é usado pelo Dashboard — o ScenarioContext original permanece intacto.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { localStorageAdapter } from "@/lib/storage";

export type GridViewKey = "bom" | "mrp" | "cenarios" | "capacidade" | "custos";

export type GridViewState = Record<string, unknown>;

interface GridViewApi {
  getView: (key: GridViewKey) => GridViewState;
  patchView: (key: GridViewKey, patch: GridViewState) => void;
}

const STORAGE_KEY = "grid-views-v1";

const GridViewContext = createContext<GridViewApi | null>(null);

export function GridViewProvider({ children }: { children: ReactNode }) {
  const [views, setViews] = useState<Record<string, GridViewState>>({});
  const hydrated = useRef(false);

  useEffect(() => {
    const persisted = localStorageAdapter.load<Record<string, GridViewState>>(STORAGE_KEY);
    if (persisted) setViews(persisted);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorageAdapter.save(STORAGE_KEY, views);
  }, [views]);

  const getView = useCallback((key: GridViewKey) => views[key] ?? {}, [views]);

  const patchView = useCallback((key: GridViewKey, patch: GridViewState) => {
    setViews((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), ...patch } }));
  }, []);

  const api = useMemo<GridViewApi>(() => ({ getView, patchView }), [getView, patchView]);

  return <GridViewContext.Provider value={api}>{children}</GridViewContext.Provider>;
}

function useGridViews(): GridViewApi {
  const ctx = useContext(GridViewContext);
  if (!ctx) throw new Error("useGridViews deve ser usado dentro de GridViewProvider");
  return ctx;
}

/** Estado de visão persistido por módulo — sobrevive à navegação entre rotas. */
export function useViewState<T extends GridViewState>(
  key: GridViewKey,
  initial: T,
): [T, (patch: Partial<T>) => void] {
  const { getView, patchView } = useGridViews();
  const stored = getView(key) as Partial<T>;
  const value = useMemo(() => ({ ...initial, ...stored }) as T, [initial, stored]);
  const patch = useCallback(
    (p: Partial<T>) => patchView(key, p as GridViewState),
    [key, patchView],
  );
  return [value, patch];
}
