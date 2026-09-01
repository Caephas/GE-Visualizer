import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ mapGenome: vi.fn(), validateGrammar: vi.fn() }));

import { mapGenome, validateGrammar } from "./api";
import App from "./App";
import type { GEParams, MapResponse, TraceStep } from "./types";

const GRAMMAR = "<start> ::= <letter> | <letter> <start>\n<letter> ::= a | b | c";

const PARAMS: GEParams = {
  codon_size: 400,
  bits_per_codon: 8,
  consumption: "eager",
  max_depth: 40,
  genome_representation: "codons",
  wrap: false,
};

const TRACE: TraceStep[] = [0, 1, 2, 3, 4].map((step) => ({
  step,
  non_terminal: "<start>",
  codon_index: step,
  codon_value: 42 + step,
  rule_count: 2,
  choice: step % 2,
  expansion: step === 4 ? "a" : "<letter> <start>",
  partial_phenotype: "partial",
  depth: step + 1,
  wraps: 0,
  consumed: true,
  complete: step === 4,
}));

const RESULT: MapResponse = {
  genome: [1, 2, 3, 4],
  params: PARAMS,
  trace: TRACE,
  phenotype: "a",
  status: "complete",
  summary: { used_codons: 5, nodes: 6, depth: 5, n_wraps: 0 },
};

describe("App", () => {
  beforeEach(() => {
    vi.mocked(validateGrammar).mockResolvedValue({
      valid: true,
      rules: 2,
      start_rule: "<start>",
      error: null,
    });
    vi.mocked(mapGenome).mockResolvedValue(RESULT);
    window.history.replaceState(
      null,
      "",
      `/?grammar=${encodeURIComponent(GRAMMAR)}&genome=1,2,3,4&params=${encodeURIComponent(
        JSON.stringify(PARAMS),
      )}&step=3&len=10`,
    );
  });

  it("restores the shared step from the URL after mapping", async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText((_content, element) => element?.className === "step-slider"),
      ).toHaveTextContent("Step 4/5");
    });
  });
});
