import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildDerivationTree } from "../lib/derivation";
import type { TraceStep } from "../types";
import { DerivationTree } from "./DerivationTree";

const TRACE: TraceStep[] = [
  {
    step: 0,
    non_terminal: "<start>",
    codon_index: 0,
    codon_value: 3,
    rule_count: 2,
    choice: 1,
    expansion: "<char> <start>",
    partial_phenotype: "<char> <start>",
    depth: 2,
    wraps: 0,
    consumed: true,
    complete: false,
  },
  {
    step: 1,
    non_terminal: "<char>",
    codon_index: 1,
    codon_value: 4,
    rule_count: 3,
    choice: 1,
    expansion: "b",
    partial_phenotype: "b <start>",
    depth: 3,
    wraps: 0,
    consumed: true,
    complete: false,
  },
];

describe("DerivationTree", () => {
  it("renders the tree with zoom controls", () => {
    const root = buildDerivationTree(TRACE, TRACE.length);
    render(<DerivationTree root={root} currentStep={1} />);
    expect(screen.getByLabelText("Derivation tree (drag to pan, scroll to zoom)")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
    expect(screen.getByLabelText("Fit tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Export tree")).toBeInTheDocument();
  });

  it("shows a tooltip with step and codon details on hover", () => {
    const root = buildDerivationTree(TRACE, TRACE.length);
    const { container } = render(<DerivationTree root={root} currentStep={1} trace={TRACE} />);
    const groups = container.querySelectorAll(".tree-node-group");
    fireEvent.mouseEnter(groups[1], { clientX: 200, clientY: 200 });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("step 1");
    expect(tooltip).toHaveTextContent(/genome\[1\] = 4/);
    expect(tooltip).toHaveTextContent("4 % 3 → choice 1");
    expect(tooltip).toHaveTextContent("→ b");
  });
});
