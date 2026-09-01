import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ mapGenome: vi.fn() }));

import { mapGenome } from "./api";
import { useVisualizer } from "./state";
import type { MapResponse } from "./types";

const RESULT: MapResponse = {
  genome: [1, 2, 3],
  params: {
    codon_size: 400,
    bits_per_codon: 8,
    consumption: "eager",
    max_depth: 40,
    genome_representation: "codons",
    wrap: false,
  },
  trace: [],
  phenotype: "<expr>",
  status: "invalid",
  summary: { used_codons: 0, nodes: 0, depth: 1, n_wraps: 0 },
};

describe("useVisualizer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(mapGenome).mockResolvedValue(RESULT);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(mapGenome).mockReset();
  });

  it("maps once on mount", () => {
    renderHook(() => useVisualizer());
    expect(mapGenome).toHaveBeenCalledTimes(1);
  });

  it("debounces successive edit maps and keeps the latest payload", async () => {
    const { result } = renderHook(() => useVisualizer());
    await act(async () => {});
    act(() => result.current.mapSoon({ genome: [1, 2] }));
    act(() => result.current.mapSoon({ genome: [3, 4] }));
    expect(mapGenome).toHaveBeenCalledTimes(1); // not yet fired
    await act(async () => {
      vi.advanceTimersByTime(450);
    });
    expect(mapGenome).toHaveBeenCalledTimes(2);
    expect(vi.mocked(mapGenome).mock.calls[1][0].genome).toEqual([3, 4]);
  });

  it("generates a genome of the requested length and re-maps", async () => {
    const { result } = renderHook(() => useVisualizer());
    await act(async () => {});
    act(() => result.current.generateGenome(5));
    await act(async () => {});
    const calls = vi.mocked(mapGenome).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][0].genome).toHaveLength(5);
  });
});
