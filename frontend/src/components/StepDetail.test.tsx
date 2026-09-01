import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TraceStep } from "../types";
import { StepDetail } from "./StepDetail";

const CONSUMED_STEP: TraceStep = {
  step: 3,
  non_terminal: "<var>",
  codon_index: 4,
  codon_value: 124,
  rule_count: 5,
  choice: 4,
  expansion: "2",
  partial_phenotype: "2 * <factor>",
  depth: 6,
  wraps: 0,
  consumed: true,
  complete: false,
};

describe("StepDetail", () => {
  it("shows the codon arithmetic for a consumed step", () => {
    render(<StepDetail step={CONSUMED_STEP} totalSteps={6} />);
    expect(screen.getByText("Step 4 / 6")).toBeInTheDocument();
    expect(screen.getByText(/genome\[4\] = 124/)).toBeInTheDocument();
    expect(screen.getByText("124 % 5 = 4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("explains when no codon is consumed", () => {
    render(<StepDetail step={{ ...CONSUMED_STEP, consumed: false }} totalSteps={6} />);
    expect(screen.getByText(/no codon consumed/)).toBeInTheDocument();
  });

  it("shows an empty state before the first step", () => {
    render(<StepDetail step={null} totalSteps={6} />);
    expect(screen.getByText(/Press ▶ to step through/)).toBeInTheDocument();
  });
});
