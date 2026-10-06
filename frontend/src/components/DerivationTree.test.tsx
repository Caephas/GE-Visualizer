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

  it("pinch-zooms on touch and pans with one finger", () => {
    const root = buildDerivationTree(TRACE, TRACE.length);
    const { container } = render(<DerivationTree root={root} currentStep={1} trace={TRACE} />);
    const svg = screen.getByLabelText("Derivation tree (drag to pan, scroll to zoom)");
    const transform = () => container.querySelector("svg g")?.getAttribute("transform") ?? "";
    const scale = () => Number(/scale\(([\d.]+)\)/.exec(transform())?.[1]);
    const translate = () =>
      (/translate\(([-\d.]+) ([-\d.]+)\)/.exec(transform()) ?? []).slice(1).map(Number);

    const before = scale();

    // Two fingers moving apart must zoom in.
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerDown(svg, { pointerId: 2, clientX: 200, clientY: 100, button: 0 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 50, clientY: 100 });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 250, clientY: 100 });
    expect(scale()).toBeGreaterThan(before);

    const zoomed = scale();
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 200, clientY: 100 });
    expect(scale()).toBeLessThan(zoomed);

    fireEvent.pointerUp(svg, { pointerId: 1 });
    fireEvent.pointerUp(svg, { pointerId: 2 });

    // A single finger again should pan rather than zoom.
    const scaleBeforePan = scale();
    const [tx, ty] = translate();
    fireEvent.pointerDown(svg, { pointerId: 3, clientX: 150, clientY: 150, button: 0 });
    fireEvent.pointerMove(svg, { pointerId: 3, clientX: 190, clientY: 180 });
    const [tx2, ty2] = translate();
    expect(tx2 - tx).toBeCloseTo(40, 0);
    expect(ty2 - ty).toBeCloseTo(30, 0);
    expect(scale()).toBeCloseTo(scaleBeforePan, 5);
  });
});
