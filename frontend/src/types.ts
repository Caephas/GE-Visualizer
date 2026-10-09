/** Shared data contracts: mapping trace, evolution events, and the engine bridge. */

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

export interface GrammarValidation {
  valid: boolean;
  rules: number;
  start_rule: string | null;
  error: string | null;
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

/**
 * Where each codon of an offspring came from. 0 and 1 are the two recorded
 * parents, 2 means the codon was rewritten by mutation, 3 means the individual
 * was copied through unchanged by elitism.
 */
export type CodonOrigin = 0 | 1 | 2 | 3;

export interface CodonChange {
  index: number;
  from: number;
  to: number;
}

/** A tournament: the population indices that competed, and the winner. */
export interface SelectionRecord {
  aspirants: number[];
  winner: number;
}

export interface LineageParent {
  genome: number[];
  fitness: number;
  selection: SelectionRecord;
}

/**
 * What the genetic operators did to one offspring. `origins` is index-aligned
 * with `genome`, so a view can colour every codon without any inference.
 */
export interface LineageRecord {
  gen: number;
  slot: number;
  operation: "elite" | "clone" | "crossover" | "mutation" | "crossover+mutation";
  genome: number[];
  origins: CodonOrigin[];
  changes: CodonChange[];
  /**
   * `[this child's split, the partner's split]`, so
   * `parents[0].genome[:split] + parents[1].genome[partnerSplit:]` is the child
   * before mutation.
   */
  crossover_points: [number, number] | null;
  parents: LineageParent[];
  fitness: number;
  parent_fitness: number[];
}

/**
 * Per-generation summary over the whole population (not just traced
 * individuals). An offspring counts as better when its fitness beats every
 * parent it inherited from; offspring that crossed over *and* mutated are
 * counted under both operators.
 */
export interface LineageStats {
  gen: number;
  crossover: { better: number; worse: number };
  mutation: { better: number; worse: number };
  elite: number;
  traced: number;
}

export type EvolutionEvent =
  | {
      type: "generation";
      gen: number;
      fitness_error?: string | null;
      best_fitness: number;
      mean_fitness: number;
      worst_fitness: number;
      valid_count: number;
      best: EvolvedIndividual;
      top: EvolvedIndividual[];
      lineage?: LineageRecord[];
      lineage_stats?: LineageStats;
    }
  | {
      type: "done";
      generations: number;
      best_fitness: number;
      best: EvolvedIndividual;
      fitness_error?: string | null;
    }
  | { type: "error"; message: string };

export interface EvolutionConfig {
  grammar_text: string;
  problem: "string_match" | "symbolic_regression" | "custom";
  /** Python source for `def fitness(phenotype) -> float`, when problem is "custom". */
  fitness_source?: string;
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
