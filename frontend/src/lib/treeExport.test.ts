import { describe, expect, it } from "vitest";

import { traceToCsv, traceToText, treeToSvg, treeThemeColors } from "./treeExport";
import type { DerivationNode, TraceStep } from "../types";

const TREE: DerivationNode = {
  id: "root",
  label: "<start>",
  kind: "root",
  step: null,
  codon_index: null,
  choice: null,
  children: [
    { id: "1-0", label: "a", kind: "terminal", step: 0, codon_index: null, choice: null, children: [] },
    {
      id: "1-1",
      label: "<expr> & <x>",
      kind: "nonterminal",
      step: 1,
      codon_index: 1,
      choice: 2,
      children: [],
    },
  ],
};

const TRACE: TraceStep[] = [
  {
    step: 0,
    non_terminal: "<start>",
    codon_index: 0,
    codon_value: 42,
    rule_count: 3,
    choice: 1,
    expansion: "a, \"b\" c",
    partial_phenotype: "a",
    depth: 2,
    wraps: 0,
    consumed: true,
    complete: false,
  },
  {
    step: 1,
    non_terminal: "<x>",
    codon_index: 1,
    codon_value: 7,
    rule_count: 1,
    choice: 0,
    expansion: "y",
    partial_phenotype: "a y",
    depth: 3,
    wraps: 0,
    consumed: false,
    complete: true,
  },
];

describe("treeToSvg", () => {
  it("emits a standalone, sized SVG", () => {
    const svg = treeToSvg(TREE);
    expect(svg.startsWith("<svg xmlns=")).toBe(true);
    expect(svg).toMatch(/width="\d+"/);
    expect(svg).toMatch(/height="\d+"/);
    expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
    expect(svg).toContain(`fill="${treeThemeColors().surface}"`); // background
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("draws one rect per node plus edges, and escapes labels", () => {
    const svg = treeToSvg(TREE);
    expect(svg.match(/<rect /g)).toHaveLength(4); // background + 3 nodes
    expect(svg.match(/<path /g)).toHaveLength(2); // two edges
    expect(svg).toContain("<title>&lt;expr&gt; &amp; &lt;x&gt;</title>");
  });

  it("can ring the active step and go transparent", () => {
    const svg = treeToSvg(TREE, { activeStep: 0, background: null });
    expect(svg).toContain(`stroke="${treeThemeColors().ink}" stroke-width="2"`);
    // The only unpositioned rect is the background; a transparent export omits it.
    expect(svg).not.toMatch(/<rect width="\d+" height="\d+"/);
  });
});

describe("traceToText", () => {
  it("records each step with its codon maths", () => {
    const text = traceToText(TRACE);
    expect(text).toContain("Step 0: <start>");
    expect(text).toContain("genome[0] = 42");
    expect(text).toContain("42 % 3 → choice 1");
    expect(text).toContain("⇒ a, \"b\" c");
    expect(text).toContain("no codon consumed (single production)");
    expect(text).toContain("Status:        complete");
    expect(text).toContain("Phenotype:     a y");
  });

  it("handles an empty trace", () => {
    expect(traceToText([])).toContain("No steps yet.");
  });
});

describe("traceToCsv", () => {
  it("writes a header and quotes fields containing commas or quotes", () => {
    const csv = traceToCsv(TRACE);
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe(
      "step,non_terminal,codon_index,codon_value,rule_count,choice,consumed,depth,wraps,expansion,partial_phenotype",
    );
    expect(lines[1]).toContain('"a, ""b"" c"');
    expect(lines).toHaveLength(3);
  });
});
