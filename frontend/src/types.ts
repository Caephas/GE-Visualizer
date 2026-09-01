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
