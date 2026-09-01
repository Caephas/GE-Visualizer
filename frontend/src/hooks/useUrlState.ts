import { useEffect, useRef } from "react";

import { parseState, serializeState } from "../lib/serialization";
import type { PersistedState } from "../lib/serialization";

export interface UseUrlStateOptions {
  state: PersistedState;
  onRestore: (restored: Partial<PersistedState>) => void;
}

/** Restores state from the URL on mount and pushes changes back (debounced). */
export function useUrlState({ state, onRestore }: UseUrlStateOptions) {
  const restoredRef = useRef(false);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    const restored = parseState(window.location.search);
    if (restored) onRestoreRef.current(restored);
    restoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    const timer = window.setTimeout(() => {
      const query = serializeState(state);
      window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state]);
}
