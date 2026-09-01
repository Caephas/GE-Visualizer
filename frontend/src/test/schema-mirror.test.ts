import { describe, expect, it } from "vitest";

import schemas from "./schemas.json";
import type {
  DerivationNode,
  EvolutionConfig,
  GEParams,
  MapRequest,
  MapResponse,
  TraceStep,
} from "../types";

/**
 * Frozen contract keys, mirrored from backend/schemas.py via
 * tools/export_schemas.py. The runtime assertions pin the pydantic schemas to
 * these keys, and the type-level assertions pin the TS interfaces to the same
 * keys — so drift on either side breaks the build.
 */
const EXPECTED_KEYS = {
  GEParams: [
    "codon_size",
    "bits_per_codon",
    "consumption",
    "max_depth",
    "genome_representation",
    "wrap",
  ],
  MapRequest: ["grammar_text", "genome", "params"],
  TraceStep: [
    "step",
    "non_terminal",
    "codon_index",
    "codon_value",
    "rule_count",
    "choice",
    "expansion",
    "partial_phenotype",
    "depth",
    "wraps",
    "consumed",
    "complete",
  ],
  DerivationNode: ["id", "label", "kind", "step", "codon_index", "choice", "children"],
  MapResponse: ["genome", "params", "trace", "phenotype", "status", "summary"],
  EvolutionConfig: [
    "grammar_text",
    "problem",
    "target",
    "samples",
    "coeffs",
    "population_size",
    "generations",
    "p_crossover",
    "p_mutation",
    "elite_size",
    "tournament_size",
    "codon_size",
    "max_depth",
    "min_init_genome_length",
    "max_init_genome_length",
    "max_genome_length",
    "consumption",
    "top_k",
    "seed",
    "early_stop",
  ],
} as const;

type Keys<T> = keyof T & string;
type Expect<T extends true> = T;
type ExactKeys<T, K extends readonly string[]> = Keys<T> extends K[number]
  ? K[number] extends Keys<T>
    ? true
    : false
  : false;

export type SchemaMirrorChecks = [
  Expect<ExactKeys<GEParams, typeof EXPECTED_KEYS.GEParams>>,
  Expect<ExactKeys<MapRequest, typeof EXPECTED_KEYS.MapRequest>>,
  Expect<ExactKeys<TraceStep, typeof EXPECTED_KEYS.TraceStep>>,
  Expect<ExactKeys<DerivationNode, typeof EXPECTED_KEYS.DerivationNode>>,
  Expect<ExactKeys<MapResponse, typeof EXPECTED_KEYS.MapResponse>>,
  Expect<ExactKeys<EvolutionConfig, typeof EXPECTED_KEYS.EvolutionConfig>>,
];

function propertiesOf(model: string): string[] {
  const schema = (schemas as Record<string, Record<string, unknown>>)[model];
  const ref = typeof schema.$ref === "string" ? schema.$ref : undefined;
  const defs = (schema.$defs ?? {}) as Record<string, { properties?: Record<string, unknown> }>;
  const resolved = ref
    ? defs[ref.split("/").pop() ?? ""]
    : (schema as { properties?: Record<string, unknown> });
  return Object.keys(resolved?.properties ?? {});
}

describe("schema mirror", () => {
  it("backend schema export covers every mirrored model", () => {
    expect(Object.keys(EXPECTED_KEYS).sort()).toEqual(Object.keys(schemas as object).sort());
  });

  it.each(Object.keys(EXPECTED_KEYS) as Array<keyof typeof EXPECTED_KEYS>)(
    "%s properties match the frozen contract",
    (model) => {
      expect(propertiesOf(model as string).sort()).toEqual([...EXPECTED_KEYS[model]].sort());
    },
  );
});
