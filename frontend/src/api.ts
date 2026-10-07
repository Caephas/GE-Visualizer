/** Engine API — mapping and evolution run in the Pyodide Web Worker. */
import { getEngine } from "./pyodide/client";
import type {
  FitnessCheck,
  FitnessExplanation,
  FitnessExplainRequest,
  GrammarSuggestion,
  TargetReachability,
} from "./pyodide/protocol";
import type {
  Consumption,
  EvolutionConfig,
  EvolutionEvent,
  GrammarValidation,
  MapRequest,
  MapResponse,
} from "./types";

export { EngineError } from "./pyodide/client";

/** Restart the engine worker, e.g. after a fitness function hangs it. */
export function restartEngine(): void {
  getEngine().restart();
}
export type { FitnessExplanation, FitnessExplainRequest } from "./pyodide/protocol";
export type { GrammarSuggestion } from "./pyodide/protocol";
export type { TargetReachability } from "./pyodide/protocol";
export type { FitnessCheck } from "./pyodide/protocol";

/** Parse a genome with the real GRAPE mapper, returning the per-step trace. */
export function mapGenome(payload: MapRequest): Promise<MapResponse> {
  return getEngine().mapGenome(payload);
}

/** Check that a BNF grammar parses before mapping or evolving. */
export function validateGrammar(grammarText: string): Promise<GrammarValidation> {
  return getEngine().validateGrammar(grammarText);
}

/** Explain how a phenotype's fitness was computed, step by step. */
export function explainFitness(
  payload: FitnessExplainRequest,
): Promise<FitnessExplanation> {
  return getEngine().explainFitness(payload);
}

/** Work out the genome and depth a grammar needs, without guessing. */
export function suggestSettings(
  grammarText: string,
  consumption: Consumption,
): Promise<GrammarSuggestion> {
  return getEngine().suggestSettings(grammarText, consumption);
}

/** Decide whether any derivation of this grammar produces `target`. */
export function analyseTarget(grammarText: string, target: string): Promise<TargetReachability> {
  return getEngine().analyseTarget(grammarText, target);
}

/** Compile a pasted fitness function and try it on one sample phenotype. */
export function checkFitness(source: string, sample = "x + 1"): Promise<FitnessCheck> {
  return getEngine().checkFitness(source, sample);
}

/** Run a GRAPE/DEAP evolution, invoking onEvent once per generation. */
export function streamEvolution(
  config: EvolutionConfig,
  onEvent: (event: EvolutionEvent) => void,
): Promise<void> {
  return getEngine().streamEvolution(config, onEvent);
}
