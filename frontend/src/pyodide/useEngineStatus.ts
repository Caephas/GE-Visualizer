import { useCallback, useSyncExternalStore } from "react";

import { getEngine, type EngineStatus } from "./client";

export interface EngineStatusInfo {
  status: EngineStatus;
  error: string | null;
}

/** Subscribes to the Pyodide engine's load status (loading → ready | error). */
export function useEngineStatus(): EngineStatusInfo {
  const engine = getEngine();
  const subscribe = useCallback((notify: () => void) => engine.subscribe(notify), [engine]);
  const status = useSyncExternalStore(subscribe, () => engine.getStatus());
  const error = useSyncExternalStore(subscribe, () => engine.getLoadError());
  return { status, error };
}
