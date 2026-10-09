import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerationView } from "./GenerationView";
import type { LineageRecord, LineageStats } from "../types";

const CROSSOVER: LineageRecord = {
  gen: 2,
  slot: 0,
  operation: "crossover+mutation",
  genome: [10, 20, 30, 30, 40],
  origins: [0, 0, 2, 1, 1],
  changes: [{ index: 2, from: 99, to: 30 }],
  crossover_points: [2, 1],
  parents: [
    {
      genome: [10, 20, 77, 88],
      fitness: 5,
      selection: { aspirants: [0, 3, 7], winner: 0 },
    },
    {
      genome: [88, 99, 30, 40],
      fitness: 3,
      selection: { aspirants: [1, 2, 9], winner: 2 },
    },
  ],
  fitness: 2,
  parent_fitness: [5, 3],
};

const ELITE: LineageRecord = {
  gen: 2,
  slot: 4,
  operation: "elite",
  genome: [1, 2, 3],
  origins: [3, 3, 3],
  changes: [],
  crossover_points: null,
  parents: [],
  fitness: 0,
  parent_fitness: [],
};

const STATS: LineageStats = {
  gen: 2,
  crossover: { better: 3, worse: 7 },
  mutation: { better: 1, worse: 4 },
  elite: 1,
  traced: 2,
};

const renderView = (lineage: LineageRecord[] | null, stats: LineageStats | null = STATS) =>
  render(<GenerationView lineage={lineage} stats={stats} onDrillDown={vi.fn()} />);

describe("GenerationView", () => {
  it("explains the colours and the generation summary", () => {
    renderView([CROSSOVER, ELITE]);
    expect(screen.getByText("from parent A")).toBeInTheDocument();
    expect(screen.getByText("from parent B")).toBeInTheDocument();
    expect(screen.getByText("mutated")).toBeInTheDocument();
    expect(screen.getByText("carried over")).toBeInTheDocument();
    expect(screen.getByText(/crossover:/)).toHaveTextContent("crossover: 3 better / 7 worse");
    expect(screen.getByText(/mutation:/)).toHaveTextContent("mutation: 1 better / 4 worse");
  });

  it("colours each codon of the offspring by where it came from", () => {
    const { container } = renderView([CROSSOVER]);
    const record = container.querySelector(".gen-record")!;
    const strips = record.querySelectorAll(".gen-strip");
    // Parent A, parent B, then the offspring.
    const codons = [...strips[strips.length - 1].querySelectorAll(".gen-codon")];

    expect(codons.map((codon) => codon.textContent)).toEqual(["10", "20", "30", "30", "40"]);
    expect(codons[0].classList.contains("origin-parent-a")).toBe(true);
    expect(codons[1].classList.contains("origin-parent-a")).toBe(true);
    expect(codons[2].classList.contains("origin-mutated")).toBe(true);
    expect(codons[3].classList.contains("origin-parent-b")).toBe(true);
    expect(codons[4].classList.contains("origin-parent-b")).toBe(true);
  });

  it("spells out the mutations and the fitness verdict", () => {
    renderView([CROSSOVER]);
    expect(screen.getByText("genome[2]: 99 → 30")).toBeInTheDocument();
    expect(screen.getByText(/fitness 2/)).toBeInTheDocument();
    expect(screen.getByText("better than its parents")).toBeInTheDocument();
  });

  it("marks a carried-over individual as having no parents", () => {
    const { container } = renderView([ELITE]);
    expect(screen.getByText("carried over unchanged")).toBeInTheDocument();
    expect(container.querySelectorAll(".gen-strip")).toHaveLength(1);
    expect(container.querySelector(".origin-elite")).toBeTruthy();
  });

  it("hands the genome back for the tree view", () => {
    const onDrillDown = vi.fn();
    render(<GenerationView lineage={[CROSSOVER]} stats={STATS} onDrillDown={onDrillDown} />);
    fireEvent.click(screen.getByRole("button", { name: "Open in tree view" }));
    expect(onDrillDown).toHaveBeenCalledWith(CROSSOVER.genome);
  });

  it("copes with a generation that has no lineage", () => {
    renderView(null, null);
    expect(screen.getByText(/Run the evolution/)).toBeInTheDocument();
  });
});
