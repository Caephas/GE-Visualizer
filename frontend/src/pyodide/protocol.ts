import type {
  Consumption,
  EvolutionConfig,
  EvolutionEvent,
  GrammarValidation,
  MapRequest,
  MapResponse,
} from "../types";

export interface GrammarSuggestion {
  consumption: Consumption;
  genome: number[];
  phenotype: string;
  min_depth: number;
  suggested_max_depth: number;
  min_codons: { eager: number; lazy: number };
}

export interface TargetReachability {
  /** false = definitely unreachable, true = a derivation exists, null = undecided. */
  reachable: boolean | null;
  missing: string[];
  length: number;
}

export interface FitnessCheck {
  valid: boolean;
  error: string | null;
  sample: string | null;
  score: number | null;
  call_error?: string | null;
}

export interface FitnessExplainRequest {
  config: EvolutionConfig;
  phenotype: string;
}

export interface FitnessExplanation {
  problem: "string_match" | "symbolic_regression";
  fitness: number;
  lines: string[];
}

/** Messages sent from the main thread to the engine Web Worker. */
export type WorkerRequest =
  | { id: number; type: "init" }
  | { id: number; type: "validate"; grammarText: string }
  | { id: number; type: "map"; payload: MapRequest }
  | { id: number; type: "suggest"; grammarText: string; consumption: Consumption }
  | { id: number; type: "analyse"; grammarText: string; target: string }
  | { id: number; type: "checkfitness"; source: string; sample: string }
  | { id: number; type: "evolve"; config: EvolutionConfig }
  | { id: number; type: "explain"; payload: FitnessExplainRequest };

/** Messages sent back from the engine Web Worker. */
export type WorkerResponse =
  | { id: number; type: "ready" }
  | { id: number; type: "validated"; value: GrammarValidation }
  | { id: number; type: "mapped"; value: MapResponse }
  | { id: number; type: "suggested"; value: GrammarSuggestion }
  | { id: number; type: "analysed"; value: TargetReachability }
  | { id: number; type: "fitnesschecked"; value: FitnessCheck }
  | { id: number; type: "explained"; value: FitnessExplanation }
  | { id: number; type: "event"; value: EvolutionEvent }
  | { id: number; type: "done" }
  | { id: number; type: "error"; message: string };
