import { describe, expect, it } from "vitest";

import type { TraceStep } from "../types";
import { buildDerivationTree, layoutTree, tokenize } from "./derivation";

const TRACE: TraceStep[] = [
  {
    step: 0,
    non_terminal: "<expr>",
    codon_index: 0,
    codon_value: 153,
    rule_count: 3,
    choice: 0,
    expansion: "<term>",
    partial_phenotype: "<term>",
    depth: 2,
    wraps: 0,
    consumed: true,
    complete: false,
  },
  {
    step: 1,
    non_terminal: "<term>",
    codon_index: 1,
    codon_value: 127,
    rule_count: 3,
    choice: 1,
    expansion: "<term> * <factor>",
    partial_phenotype: "<term> * <factor>",
    depth: 3,
    wraps: 0,
    consumed: true,
    complete: false,
  },
  {
    step: 2,
    non_terminal: "<term>",
    codon_index: 2,
    codon_value: 92,
    rule_count: 3,
    choice: 0,
    expansion: "<factor>",
    partial_phenotype: "<factor> * <factor>",
    depth: 4,
    wraps: 0,
    consumed: true,
    complete: false,
  },
  {
    step: 3,
    non_terminal: "<factor>",
    codon_index: 3,
    codon_value: 399,
    rule_count: 2,
    choice: 1,
    expansion: "<var>",
    partial_phenotype: "<var> * <factor>",
    depth: 5,
    wraps: 0,
    consumed: true,
    complete: false,
  },
  {
    step: 4,
    non_terminal: "<var>",
    codon_index: 4,
    codon_value: 124,
    rule_count: 5,
    choice: 3,
    expansion: "2",
    partial_phenotype: "2 * <factor>",
    depth: 6,
    wraps: 0,
    consumed: true,
    complete: false,
  },
];

describe("tokenize", () => {
  it("classifies non-terminals and terminals", () => {
    expect(tokenize("<term> * <factor>")).toEqual([
      { type: "nonterminal", value: "<term>" },
      { type: "terminal", value: "*" },
      { type: "nonterminal", value: "<factor>" },
    ]);
    expect(tokenize("2")).toEqual([{ type: "terminal", value: "2" }]);
  });
});

describe("buildDerivationTree", () => {
  it("builds the expected tree for a trace prefix", () => {
    const tree = buildDerivationTree(TRACE, TRACE.length);
    expect(tree.label).toBe("<expr>");
    expect(tree.step).toBe(0);
    expect(tree.codon_index).toBe(0);

    const term = tree.children[0];
    expect(term.label).toBe("<term>");
    expect(term.step).toBe(1);
    expect(term.codon_index).toBe(1);
    expect(term.children.map((child) => child.label)).toEqual(["<term>", "*", "<factor>"]);

    const nestedTerm = term.children[0];
    expect(nestedTerm.children.map((child) => child.label)).toEqual(["<factor>"]);
    expect(nestedTerm.children[0].children[0].label).toBe("<var>");
    expect(nestedTerm.children[0].children[0].children[0]).toMatchObject({
      label: "2",
      kind: "terminal",
      step: 4,
    });
    expect(nestedTerm.children[0].children[0].children[0].codon_index).toBeNull();
  });

  it("only expands the requested prefix", () => {
    const tree = buildDerivationTree(TRACE, 2);
    const term = tree.children[0];
    expect(term.children.map((child) => child.label)).toEqual(["<term>", "*", "<factor>"]);
    // step 2 onward is not applied
    expect(term.children[0].children).toEqual([]);
  });

  it("layouts a single node", () => {
    const root = buildDerivationTree([], 0);
    const layout = layoutTree(root);
    expect(layout.nodes).toHaveLength(1);
    expect(layout.edges).toHaveLength(0);
  });

  it("layouts a multi-node tree with edges", () => {
    const layout = layoutTree(buildDerivationTree(TRACE, TRACE.length));
    expect(layout.nodes.length).toBeGreaterThan(1);
    expect(layout.edges.length).toBeGreaterThan(0);
  });
});
