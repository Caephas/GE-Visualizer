import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PersistedState } from "../lib/serialization";
import { DEFAULT_PARAMS } from "../state";
import { useUrlState } from "./useUrlState";

const STATE: PersistedState = {
  grammarText: "<s> ::= x",
  genome: [1],
  params: DEFAULT_PARAMS,
  currentStep: -1,
  genomeLength: 10,
};

describe("useUrlState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores state from the URL on mount", () => {
    window.history.replaceState(
      null,
      "",
      "/?grammar=%3Cs%3E%20%3A%3A%3D%20x&genome=1&params=%7B%7D&step=-1&len=10",
    );
    const onRestore = vi.fn();
    renderHook(() => useUrlState({ state: STATE, onRestore }));
    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore.mock.calls[0][0].grammarText).toBe("<s> ::= x");
  });

  it("writes state changes to the URL (debounced)", async () => {
    const { rerender } = renderHook(
      ({ state }) => useUrlState({ state, onRestore: vi.fn() }),
      { initialProps: { state: STATE } },
    );
    rerender({ state: { ...STATE, genome: [9, 9] } });
    expect(window.location.search).not.toContain("genome=9%2C9");
    await act(async () => {
      vi.advanceTimersByTime(450);
    });
    expect(window.location.search).toContain("genome=9%2C9");
  });
});
