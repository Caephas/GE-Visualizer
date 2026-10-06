import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api", () => ({
  streamEvolution: vi.fn(),
  explainFitness: vi.fn(),
  analyseTarget: vi.fn(),
}));

import { analyseTarget, explainFitness, streamEvolution } from "../api";
import { TOY_PROBLEMS } from "../examples/problems";
import type { EvolutionEvent, EvolvedIndividual } from "../types";
import { EvolutionPanel } from "./EvolutionPanel";

const INDIVIDUAL_A: EvolvedIndividual = {
  genome: [1, 2, 3],
  phenotype: "hello",
  fitness: 0.5,
  invalid: false,
};

const INDIVIDUAL_B: EvolvedIndividual = {
  genome: [9, 8, 7],
  phenotype: "hallo",
  fitness: 1.5,
  invalid: false,
};

const GENERATION_EVENT: EvolutionEvent = {
  type: "generation",
  gen: 1,
  best_fitness: 0.5,
  mean_fitness: 3,
  worst_fitness: 9,
  valid_count: 10,
  best: INDIVIDUAL_A,
  top: [INDIVIDUAL_A, INDIVIDUAL_B],
};

const DONE_EVENT: EvolutionEvent = {
  type: "done",
  generations: 1,
  best_fitness: 0.5,
  best: INDIVIDUAL_A,
};

function mockStream() {
  vi.mocked(streamEvolution).mockImplementation(async (_config, onEvent) => {
    onEvent(GENERATION_EVENT);
    onEvent(DONE_EVENT);
  });
}

beforeEach(() => {
  vi.mocked(analyseTarget).mockResolvedValue({ reachable: true, missing: [], length: 6 });
});

function renderPanel(overrides: Partial<Parameters<typeof EvolutionPanel>[0]> = {}) {
  return render(
    <EvolutionPanel
      grammarText="<start> ::= x"
      grammarValid={true}
      onDrillDown={vi.fn()}
      onUseGrammar={vi.fn()}
      {...overrides}
    />,
  );
}

describe("EvolutionPanel", () => {
  it("runs evolution and renders results", async () => {
    mockStream();
    renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run" }));
    });
    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.getByText("hallo")).toBeInTheDocument();
    expect(screen.getByText(/Best fitness after 1 generation/)).toBeInTheDocument();
  });

  it("drills down into an individual's genome", async () => {
    mockStream();
    const onDrillDown = vi.fn();
    renderPanel({ onDrillDown });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run" }));
    });
    const loadButtons = await screen.findAllByRole("button", { name: "Load" });
    fireEvent.click(loadButtons[0]);
    expect(onDrillDown).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("shows stream errors", async () => {
    vi.mocked(streamEvolution).mockImplementation(async (_config, onEvent) => {
      onEvent({ type: "error", message: "boom" });
    });
    renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run" }));
    });
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("disables running until the grammar is valid", () => {
    renderPanel({ grammarText: "not bnf", grammarValid: false });
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
  });

  it("warns about heavy runs and clamps the population", () => {
    renderPanel();
    expect(screen.queryByText("Large run")).not.toBeInTheDocument();

    const population = screen.getByLabelText("Pop");
    fireEvent.change(population, { target: { value: "1000" } });
    expect(population).toHaveValue(1000);
    expect(screen.getByText("Large run")).toBeInTheDocument();

    // Absurd values are clamped instead of being queued.
    fireEvent.change(population, { target: { value: "99999" } });
    expect(population).toHaveValue(2000);
  });

  it("disables running when the population is out of range", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Pop"), { target: { value: "1" } });
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
  });

  it("offers the matching grammar for the selected problem", () => {
    const onUseGrammar = vi.fn();
    renderPanel({ onUseGrammar });
    const stringProblem = TOY_PROBLEMS[0];
    expect(screen.getByText(stringProblem.recommendedGrammarName)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use it" }));
    expect(onUseGrammar).toHaveBeenCalledWith(stringProblem.recommendedGrammar);
  });

  it("hides the suggestion when the grammar already matches", () => {
    renderPanel({ grammarText: TOY_PROBLEMS[0].recommendedGrammar });
    expect(screen.queryByRole("button", { name: "Use it" })).not.toBeInTheDocument();
  });

  it("explains how a phenotype was scored", async () => {
    mockStream();
    vi.mocked(explainFitness).mockResolvedValue({
      problem: "string_match",
      fitness: 0.5,
      lines: ['Phenotype (whitespace removed): "hello"', "Fitness = 0 + 0 = 0"],
    });
    renderPanel();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run" }));
    });
    await screen.findByText("hello");

    fireEvent.click(screen.getAllByTitle("How is this score calculated?")[0]);
    expect(await screen.findByText(/Phenotype \(whitespace removed\)/)).toBeInTheDocument();
    expect(explainFitness).toHaveBeenCalledWith({
      config: expect.objectContaining({ problem: "string_match", target: "abcabc" }),
      phenotype: "hello",
    });

    // Clicking again collapses the detail row.
    fireEvent.click(screen.getAllByTitle("How is this score calculated?")[0]);
    await waitFor(() =>
      expect(screen.queryByText(/Phenotype \(whitespace removed\)/)).not.toBeInTheDocument(),
    );
  });

  it("warns when the target cannot be produced by the grammar", async () => {
    vi.mocked(analyseTarget).mockResolvedValue({ reachable: false, missing: ["z"], length: 6 });
    renderPanel();
    expect(await screen.findByText("Unreachable target", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/no way to produce "z"/)).toBeInTheDocument();
    expect(analyseTarget).toHaveBeenCalledWith("<start> ::= x", "abcabc");
  });

  it("stays quiet when the target is reachable", async () => {
    renderPanel();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(screen.queryByText("Unreachable target")).not.toBeInTheDocument();
  });
});
