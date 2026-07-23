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
  ModelId,
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

export interface CapacityParam {
  taxaPorDia: number | null; // unidades por dia por operador
  operadores: number | null; // operadores disponíveis
}

interface ScenarioState {
  scenarioId: string;
  baseDate: string;
  periodos: string[];
  products: ProductModel[];
  stages: ProcessStage[];
  yields: YieldParameter[];
  materials: Material[];
  bom: BomLine[];
  demand: DemandPeriod[];
  viewMode: "mensal" | "anual";
  capacity: Record<string, CapacityParam>;
}

interface ScenarioApi {
  state: ScenarioState;
  setYieldValue: (stageId: string, modelId: ModelId, valor: number | null) => void;
  setStageActive: (stageId: string, ativo: boolean) => void;
  setDemand: (modelId: ModelId, periodo: string, demanda: number) => void;
  setDemandBulk: (modelId: ModelId, updates: Record<string, number>) => void;
  setViewMode: (v: "mensal" | "anual") => void;
  setBomQty: (index: number, qtyPer: number | null) => void;
  setMaterialField: (
    id: string,
    field: "custoCentavos" | "leadTimeMeses",
    value: number | null,
  ) => void;
  setCapacity: (stageId: string, patch: Partial<CapacityParam>) => void;
  resetToSeed: () => void;
}

const ScenarioContext = createContext<ScenarioApi | null>(null);

const STORAGE_KEY = "scenario-default-v2";

function defaultState(): ScenarioState {
  // Horizonte fixo: 3 anos calendário iniciando em Janeiro/2027.
  const baseDate = "2027-01";
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
    capacity: {},
  };
}

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScenarioState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persisted = localStorageAdapter.load<ScenarioState>(STORAGE_KEY);
    if (persisted && persisted.periodos && persisted.stages) {
      // Compat: garante campos novos após updates de schema.
      setState({ ...defaultState(), ...persisted, capacity: persisted.capacity ?? {} });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorageAdapter.save(STORAGE_KEY, state);
  }, [state, hydrated]);

  const setYieldValue = useCallback(
    (stageId: string, modelId: ModelId, valor: number | null) => {
      setState((s) => {
        const idx = s.yields.findIndex(
          (y) => y.stageId === stageId && y.modelId === modelId,
        );
        if (idx === -1) {
          // Cria caso não exista (migração de dados antigos sem modelId).
          return {
            ...s,
            yields: [
              ...s.yields,
              {
                id: `${stageId}__${modelId}`,
                stageId,
                modelId,
                valor,
                tipoPerda: "sucata",
                source: { documento: "Edição usuário", status: "provisorio" },
              },
            ],
          };
        }
        const next = s.yields.slice();
        next[idx] = { ...next[idx], valor };
        return { ...s, yields: next };
      });
    },
    [],
  );

  const setStageActive = useCallback((stageId: string, ativo: boolean) => {
    setState((s) => ({
      ...s,
      stages: s.stages.map((st) => (st.id === stageId ? { ...st, ativo } : st)),
    }));
  }, []);

  const setDemand = useCallback(
    (modelId: ModelId, periodo: string, demanda: number) => {
      setState((s) => ({
        ...s,
        demand: s.demand.map((d) =>
          d.modelId === modelId && d.periodo === periodo ? { ...d, demanda } : d,
        ),
      }));
    },
    [],
  );

  const setDemandBulk = useCallback(
    (modelId: ModelId, updates: Record<string, number>) => {
      setState((s) => ({
        ...s,
        demand: s.demand.map((d) =>
          d.modelId === modelId && updates[d.periodo] !== undefined
            ? { ...d, demanda: updates[d.periodo] }
            : d,
        ),
      }));
    },
    [],
  );

  const setViewMode = useCallback((v: "mensal" | "anual") => {
    setState((s) => ({ ...s, viewMode: v }));
  }, []);

  const setBomQty = useCallback((index: number, qtyPer: number | null) => {
    setState((s) => ({
      ...s,
      bom: s.bom.map((b, i) => (i === index ? { ...b, qtyPer } : b)),
    }));
  }, []);

  const setMaterialField = useCallback(
    (id: string, field: "custoCentavos" | "leadTimeMeses", value: number | null) => {
      setState((s) => ({
        ...s,
        materials: s.materials.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
      }));
    },
    [],
  );

  const setCapacity = useCallback(
    (stageId: string, patch: Partial<CapacityParam>) => {
      setState((s) => {
        const prev = s.capacity[stageId] ?? { taxaPorDia: null, operadores: null };
        return {
          ...s,
          capacity: { ...s.capacity, [stageId]: { ...prev, ...patch } },
        };
      });
    },
    [],
  );

  const resetToSeed = useCallback(() => setState(defaultState()), []);

  const api = useMemo<ScenarioApi>(
    () => ({
      state,
      setYieldValue,
      setStageActive,
      setDemand,
      setDemandBulk,
      setViewMode,
      setBomQty,
      setMaterialField,
      setCapacity,
      resetToSeed,
    }),
    [
      state,
      setYieldValue,
      setStageActive,
      setDemand,
      setDemandBulk,
      setViewMode,
      setBomQty,
      setMaterialField,
      setCapacity,
      resetToSeed,
    ],
  );

  return <ScenarioContext.Provider value={api}>{children}</ScenarioContext.Provider>;
}

export function useScenario(): ScenarioApi {
  const ctx = useContext(ScenarioContext);
  if (!ctx) throw new Error("useScenario deve estar dentro de <ScenarioProvider>");
  return ctx;
}
