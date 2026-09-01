/**
 * Mirrors backend/schemas.py (pydantic). These contracts are FROZEN for the
 * duration of the epic; changing them requires re-planning (Phase 0 of the
 * development plan).
 */

export type Consumption = "eager" | "lazy";
export type GenomeRep = "binary" | "codons";

export interface GEParams {
  codon_size: number;
  bits_per_codon: number;
  consumption: Consumption;
  max_depth: number;
  genome_representation: GenomeRep;
  wrap: boolean;
}

export interface GrammarUpload {
  grammar_text: string;
}

export interface MapRequest {
  grammar_text: string;
  genome: number[];
  params: GEParams;
}

export interface TraceStep {
  step: number;
  non_terminal: string;
  codon_index: number;
  codon_value: number;
  rule_count: number;
  choice: number;
  expansion: string;
  partial_phenotype: string;
  depth: number;
  wraps: number;
  consumed: boolean;
  complete: boolean;
}

export type NodeKind = "root" | "nonterminal" | "terminal";

export interface DerivationNode {
  id: string;
  label: string;
  kind: NodeKind;
  step: number | null;
  codon_index: number | null;
  choice: number | null;
  children: DerivationNode[];
}

export type MapStatus = "complete" | "invalid" | "depth-limited";

export interface MapResponse {
  genome: number[];
  params: GEParams;
  trace: TraceStep[];
  phenotype: string;
  status: MapStatus;
  summary: Record<string, number>;
}

export interface EvolvedIndividual {
  genome: number[];
  phenotype: string;
  fitness: number;
  invalid: boolean;
}

export type EvolutionEvent =
  | {
      type: "generation";
      gen: number;
      best_fitness: number;
      mean_fitness: number;
      worst_fitness: number;
      valid_count: number;
      best: EvolvedIndividual;
      top: EvolvedIndividual[];
    }
  | { type: "done"; generations: number; best_fitness: number; best: EvolvedIndividual }
  | { type: "error"; message: string };

export interface EvolutionConfig {
  grammar_text: string;
  problem: "string_match" | "symbolic_regression";
  target: string;
  samples: number[];
  coeffs: number[];
  population_size: number;
  generations: number;
  p_crossover: number;
  p_mutation: number;
  elite_size: number;
  tournament_size: number;
  codon_size: number;
  max_depth: number;
  min_init_genome_length: number;
  max_init_genome_length: number;
  max_genome_length: number | null;
  consumption: Consumption;
  top_k: number;
  seed: number;
  early_stop: boolean;
}
