import { describe, expect, it } from "vitest";

import { DEFAULT_GENOME, DEFAULT_PARAMS, reducer } from "./state";
import type { AppState } from "./state";
import type { MapResponse, TraceStep } from "./types";

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    grammarText: "<start> ::= x",
    grammarStatus: "valid",
    grammarError: null,
    grammarRules: null,
    genome: DEFAULT_GENOME,
    params: DEFAULT_PARAMS,
    result: null,
    currentStep: -1,
    loading: false,
    error: null,
    ...overrides,
  };
}

function traceOf(length: number): TraceStep[] {
  return Array.from({ length }, (_, step) => ({
    step,
    non_terminal: "<start>",
    codon_index: step,
    codon_value: 1,
    rule_count: 1,
    choice: 0,
    expansion: "x",
    partial_phenotype: "x",
    depth: 2,
    wraps: 0,
    consumed: true,
    complete: step === length - 1,
  }));
}

function resultWith(traceLength: number): MapResponse {
  return {
    genome: DEFAULT_GENOME,
    params: DEFAULT_PARAMS,
    trace: traceOf(traceLength),
    phenotype: "x",
    status: "complete",
    summary: { used_codons: traceLength, nodes: traceLength, depth: 2, n_wraps: 0 },
  };
}

describe("reducer", () => {
  it("stores a map result and resets the step to before the start", () => {
    const state = reducer(baseState(), { type: "MAP_SUCCESS", result: resultWith(3) });
    expect(state.result?.trace).toHaveLength(3);
    expect(state.currentStep).toBe(-1);
    expect(state.loading).toBe(false);
  });

  it("steps forward up to the last step", () => {
    let state = reducer(baseState({ result: resultWith(3), currentStep: -1 }), { type: "STEP_FWD" });
    expect(state.currentStep).toBe(0);
    state = reducer(state, { type: "STEP_FWD" });
    state = reducer(state, { type: "STEP_FWD" });
    state = reducer(state, { type: "STEP_FWD" });
    expect(state.currentStep).toBe(2);
  });

  it("steps back down to before the start", () => {
    let state = reducer(baseState({ result: resultWith(3), currentStep: 1 }), { type: "STEP_BACK" });
    expect(state.currentStep).toBe(0);
    state = reducer(state, { type: "STEP_BACK" });
    state = reducer(state, { type: "STEP_BACK" });
    expect(state.currentStep).toBe(-1);
  });

  it("jumps to an explicit step and resets playback", () => {
    const jumped = reducer(baseState({ result: resultWith(3) }), { type: "JUMP_TO_STEP", step: 2 });
    expect(jumped.currentStep).toBe(2);
    const reset = reducer(jumped, { type: "RESET_PLAYBACK" });
    expect(reset.currentStep).toBe(-1);
  });

  it("clears stale results when inputs change", () => {
    const withResult = baseState({ result: resultWith(3), currentStep: 1 });
    const afterEdit = reducer(withResult, { type: "SET_GENOME", genome: [9, 9] });
    expect(afterEdit.result).toBeNull();
    expect(afterEdit.currentStep).toBe(-1);
    expect(afterEdit.genome).toEqual([9, 9]);
  });

  it("merges partial params", () => {
    const state = reducer(baseState(), { type: "SET_PARAMS", params: { wrap: true } });
    expect(state.params.wrap).toBe(true);
    expect(state.params.consumption).toBe("eager");
  });

  it("tracks grammar validation state", () => {
    let state = reducer(baseState(), { type: "VALIDATE_START" });
    expect(state.grammarStatus).toBe("validating");
    state = reducer(state, { type: "VALIDATE_DONE", valid: false, error: "nope", rules: 0 });
    expect(state.grammarStatus).toBe("invalid");
    expect(state.grammarError).toBe("nope");
    state = reducer(state, { type: "SET_GRAMMAR_TEXT", grammarText: "<a> ::= x" });
    expect(state.grammarStatus).toBe("unknown");
    expect(state.grammarError).toBeNull();
  });

  it("ignores stepping without a result", () => {
    const state = reducer(baseState(), { type: "STEP_FWD" });
    expect(state.currentStep).toBe(-1);
  });
});
