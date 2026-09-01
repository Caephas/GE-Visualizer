import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Dispatch } from "react";

import { mapGenome, validateGrammar } from "./api";
import { EXAMPLE_GRAMMARS } from "./examples/grammars";
import { codonsToBits, randomGenome } from "./lib/encoding";
import type { GEParams, MapRequest, MapResponse } from "./types";

export interface AppState {
  grammarText: string;
  grammarStatus: "unknown" | "validating" | "valid" | "invalid";
  grammarError: string | null;
  grammarRules: number | null;
  genome: number[];
  params: GEParams;
  result: MapResponse | null;
  currentStep: number;
  loading: boolean;
  error: string | null;
}

export type Action =
  | { type: "SET_GRAMMAR_TEXT"; grammarText: string }
  | { type: "SET_GENOME"; genome: number[] }
  | { type: "SET_PARAMS"; params: Partial<GEParams> }
  | { type: "VALIDATE_START" }
  | { type: "VALIDATE_DONE"; valid: boolean; error: string | null; rules: number }
  | { type: "MAP_START" }
  | { type: "MAP_SUCCESS"; result: MapResponse }
  | { type: "MAP_ERROR"; error: string }
  | { type: "STEP_FWD" }
  | { type: "STEP_BACK" }
  | { type: "JUMP_TO_STEP"; step: number }
  | { type: "RESET_PLAYBACK" };

export const DEFAULT_PARAMS: GEParams = {
  codon_size: 400,
  bits_per_codon: 8,
  consumption: "eager",
  max_depth: 40,
  genome_representation: "codons",
  wrap: false,
};

export const DEFAULT_GENOME = [42, 7, 13, 99, 2, 55];

function initialState(): AppState {
  return {
    grammarText: EXAMPLE_GRAMMARS[0].grammar,
    grammarStatus: "unknown",
    grammarError: null,
    grammarRules: null,
    genome: DEFAULT_GENOME,
    params: DEFAULT_PARAMS,
    result: null,
    currentStep: -1,
    loading: false,
    error: null,
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_GRAMMAR_TEXT":
      return {
        ...state,
        grammarText: action.grammarText,
        grammarStatus: "unknown",
        grammarError: null,
        grammarRules: null,
        result: null,
        currentStep: -1,
        error: null,
      };
    case "SET_GENOME":
      return { ...state, genome: action.genome, result: null, currentStep: -1, error: null };
    case "SET_PARAMS":
      return { ...state, params: { ...state.params, ...action.params }, result: null, currentStep: -1, error: null };
    case "VALIDATE_START":
      return { ...state, grammarStatus: "validating" };
    case "VALIDATE_DONE":
      return {
        ...state,
        grammarStatus: action.valid ? "valid" : "invalid",
        grammarError: action.error,
        grammarRules: action.rules,
      };
    case "MAP_START":
      return { ...state, loading: true, error: null };
    case "MAP_SUCCESS":
      return { ...state, loading: false, result: action.result, currentStep: -1, error: null };
    case "MAP_ERROR":
      return { ...state, loading: false, error: action.error };
    case "STEP_FWD": {
      if (!state.result) return state;
      const last = state.result.trace.length - 1;
      return { ...state, currentStep: Math.min(last, state.currentStep + 1) };
    }
    case "STEP_BACK":
      return { ...state, currentStep: Math.max(-1, state.currentStep - 1) };
    case "JUMP_TO_STEP":
      return { ...state, currentStep: action.step };
    case "RESET_PLAYBACK":
      return { ...state, currentStep: -1 };
    default:
      return state;
  }
}

export interface Visualizer {
  state: AppState;
  dispatch: Dispatch<Action>;
  map: (overrides?: MapOverrides) => Promise<void>;
  mapSoon: (overrides?: MapOverrides) => void;
  applyGrammar: (grammarText: string) => void;
  generateGenome: (length?: number) => void;
}

export interface MapOverrides {
  grammarText?: string;
  genome?: number[];
  params?: GEParams;
}

export function useVisualizer(): Visualizer {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  const requestSeqRef = useRef(0);
  const mapTimerRef = useRef<number | null>(null);
  const validateTimerRef = useRef<number | null>(null);
  const validateSeqRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(
    () => () => {
      if (mapTimerRef.current) window.clearTimeout(mapTimerRef.current);
      if (validateTimerRef.current) window.clearTimeout(validateTimerRef.current);
    },
    [],
  );

  const validate = useCallback(async (grammarText?: string) => {
    const text = grammarText ?? stateRef.current.grammarText;
    const seq = ++validateSeqRef.current;
    dispatch({ type: "VALIDATE_START" });
    try {
      const result = await validateGrammar(text);
      if (seq !== validateSeqRef.current) return false;
      dispatch({ type: "VALIDATE_DONE", valid: result.valid, error: result.error, rules: result.rules });
      return result.valid;
    } catch (error) {
      if (seq !== validateSeqRef.current) return false;
      dispatch({
        type: "VALIDATE_DONE",
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        rules: 0,
      });
      return false;
    }
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    dispatch({ type: "VALIDATE_START" });
    if (validateTimerRef.current) window.clearTimeout(validateTimerRef.current);
    validateTimerRef.current = window.setTimeout(() => {
      void validate();
    }, 400);
    return () => {
      if (validateTimerRef.current) window.clearTimeout(validateTimerRef.current);
    };
  }, [state.grammarText, validate]);

  const map = useCallback(async (overrides?: MapOverrides) => {
    const current = stateRef.current;
    const grammarText = overrides?.grammarText ?? current.grammarText;
    const genome = overrides?.genome ?? current.genome;
    const params = overrides?.params ?? current.params;
    const seq = ++requestSeqRef.current;
    dispatch({ type: "MAP_START" });
    const payload: MapRequest = {
      grammar_text: grammarText,
      genome: params.genome_representation === "binary" ? codonsToBits(genome, params.bits_per_codon) : genome,
      params,
    };
    try {
      const result = await mapGenome(payload);
      if (seq === requestSeqRef.current) dispatch({ type: "MAP_SUCCESS", result });
    } catch (error) {
      if (seq === requestSeqRef.current) {
        dispatch({ type: "MAP_ERROR", error: error instanceof Error ? error.message : String(error) });
      }
    }
  }, []);

  const mapSoon = useCallback(
    (overrides?: MapOverrides) => {
      if (mapTimerRef.current) window.clearTimeout(mapTimerRef.current);
      mapTimerRef.current = window.setTimeout(() => {
        void map(overrides);
      }, 400);
    },
    [map],
  );

  useEffect(() => {
    mountedRef.current = true;
    void (async () => {
      const valid = await validate();
      if (valid) void map();
    })();
    // Validate once on mount, then auto-map if the grammar parses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyGrammar = useCallback(
    async (grammarText: string) => {
      dispatch({ type: "SET_GRAMMAR_TEXT", grammarText });
      const valid = await validate(grammarText);
      if (valid) void map({ grammarText });
    },
    [map, validate],
  );

  const generateGenome = useCallback((length = 10) => {
    const genome = randomGenome(length, stateRef.current.params.codon_size);
    dispatch({ type: "SET_GENOME", genome });
    void map({ genome });
  }, [map]);

  return { state, dispatch, map, mapSoon, applyGrammar, generateGenome };
}
