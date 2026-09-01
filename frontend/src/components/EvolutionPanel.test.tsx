import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../api", () => ({ streamEvolution: vi.fn() }));

import { streamEvolution } from "../api";
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

describe("EvolutionPanel", () => {
  it("runs evolution and renders results", async () => {
    mockStream();
    render(<EvolutionPanel grammarText="<start> ::= x" onDrillDown={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Run evolution"));
    });
    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.getByText("hallo")).toBeInTheDocument();
    expect(screen.getByText(/Best fitness after 1 generation/)).toBeInTheDocument();
  });

  it("drills down into an individual's genome", async () => {
    mockStream();
    const onDrillDown = vi.fn();
    render(<EvolutionPanel grammarText="<start> ::= x" onDrillDown={onDrillDown} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Run evolution"));
    });
    const loadButtons = await screen.findAllByRole("button", { name: "Load" });
    fireEvent.click(loadButtons[0]);
    expect(onDrillDown).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("shows stream errors", async () => {
    vi.mocked(streamEvolution).mockImplementation(async (_config, onEvent) => {
      onEvent({ type: "error", message: "boom" });
    });
    render(<EvolutionPanel grammarText="<start> ::= x" onDrillDown={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText("Run evolution"));
    });
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
