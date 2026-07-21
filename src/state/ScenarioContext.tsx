import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  BomLine,
  DemandPeriod,
  Material,
  ProcessStage,
  ProductModel,
  YieldParameter,
} from "@/domain/types";
import { products } from "@/data/models";
import { stages as seedStages } from "@/data/route";
import { yields as seedYields } from "@/data/yields";
import { materials as seedMaterials } from "@/data/materials";
import { bom as seedBom } from "@/data/bom";
import { generatePeriods, seedDemand } from "@/data/demand";
import { localStorageAdapter } from "@/lib/storage";

interface ScenarioState {
  scenarioId: string;
  baseDate: string; // YYYY-MM
  periodos: string[];
  products: ProductModel[];
  stages: ProcessStage[];
  yields: YieldParameter[];
  materials: Material[];
  bom: BomLine[];
  demand: DemandPeriod[];
  viewMode: "mensal" | "anual";
}

interface ScenarioApi {
  state: ScenarioState;
  setYieldValue: (stageId: string, valor: number | null) => void;
  setStageActive: (stageId: string, ativo: boolean) => void;
  setDemand: (modelId: DemandPeriod["modelId"], periodo: string, demanda: number) => void;
  setDemandBulk: (
    modelId: DemandPeriod["modelId"],
    updates: Record<string, number>,
  ) => void;
  setViewMode: (v: "mensal" | "anual") => void;
  resetToSeed: () => void;
}

const ScenarioContext = createContext<ScenarioApi | null>(null);

const STORAGE_KEY = "scenario-default";

function defaultState(): ScenarioState {
  const today = new Date();
  const baseDate = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const periodos = generatePeriods(baseDate, 36);
  return {
    scenarioId: "default",
    baseDate,
    periodos,
    products,
    stages: seedStages,
    yields: seedYields,
    materials: seedMaterials,
    bom: seedBom,
    demand: seedDemand(periodos),
    viewMode: "mensal",
  };
}

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScenarioState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = localStorageAdapter.load<ScenarioState>(STORAGE_KEY);
    if (persisted && persisted.periodos && persisted.stages) {
      setState(persisted);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorageAdapter.save(STORAGE_KEY, state);
  }, [state, hydrated]);

  const setYieldValue = useCallback((stageId: string, valor: number | null) => {
    setState((s) => ({
      ...s,
      yields: s.yields.map((y) => (y.stageId === stageId ? { ...y, valor } : y)),
    }));
  }, []);

  const setStageActive = useCallback((stageId: string, ativo: boolean) => {
    setState((s) => ({
      ...s,
      stages: s.stages.map((st) => (st.id === stageId ? { ...st, ativo } : st)),
    }));
  }, []);

  const setDemand = useCallback(
    (modelId: DemandPeriod["modelId"], periodo: string, demanda: number) => {
      setState((s) => ({
        ...s,
        demand: s.demand.map((d) =>
          d.modelId === modelId && d.periodo === periodo ? { ...d, demanda } : d,
        ),
      }));
    },
    [],
  );

  const setViewMode = useCallback((v: "mensal" | "anual") => {
    setState((s) => ({ ...s, viewMode: v }));
  }, []);

  const resetToSeed = useCallback(() => setState(defaultState()), []);

  const api = useMemo<ScenarioApi>(
    () => ({ state, setYieldValue, setStageActive, setDemand, setViewMode, resetToSeed }),
    [state, setYieldValue, setStageActive, setDemand, setViewMode, resetToSeed],
  );

  return <ScenarioContext.Provider value={api}>{children}</ScenarioContext.Provider>;
}

export function useScenario(): ScenarioApi {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario deve estar dentro de <ScenarioProvider>");
  return ctx;
}
