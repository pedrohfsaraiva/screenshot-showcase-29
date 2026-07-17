// Adapter de persistência com versionamento de schema.
// Fase 1: localStorage. Interface preparada para trocar por Supabase depois.

export interface StorageAdapter {
  load<T>(key: string): T | null;
  save<T>(key: string, value: T): void;
  remove(key: string): void;
}

export const SCHEMA_VERSION = 1;
const NS = "topaz-mrp";

function fullKey(key: string): string {
  return `${NS}/v${SCHEMA_VERSION}/${key}`;
}

export const localStorageAdapter: StorageAdapter = {
  load<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(fullKey(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  save<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(fullKey(key), JSON.stringify(value));
    } catch {
      /* quota — ignorar em fase 1 */
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(fullKey(key));
  },
};
