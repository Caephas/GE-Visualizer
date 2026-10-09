import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CUSTOM_FITNESS_TEMPLATE, GROVER_FITNESS } from "../examples/problems";
import { readFitness, readFitnessSource, writeFitnessSource } from "./fitnessStorage";

const KEY = "ge-visualizer.fitness";

describe("fitnessStorage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("falls back to the starter template when nothing is stored", () => {
    expect(readFitness()).toEqual({ source: CUSTOM_FITNESS_TEMPLATE, example: null });
  });

  it("keeps a visitor's own code from the legacy bare-string format", () => {
    window.localStorage.setItem(KEY, "def fitness(phenotype):\n    return 0.0\n");
    expect(readFitnessSource()).toBe("def fitness(phenotype):\n    return 0.0\n");
    expect(readFitness().example).toBeNull();
  });

  it("round-trips an example the visitor has not edited", () => {
    writeFitnessSource(GROVER_FITNESS, "grover");
    expect(readFitness()).toEqual({ source: GROVER_FITNESS, example: "grover" });
  });

  it("refreshes a bundled example saved at an older version", () => {
    // A copy of the Grover example that predates the latest fix.
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ source: "stale grover source", example: "grover", version: "old" }),
    );
    expect(readFitness()).toEqual({ source: GROVER_FITNESS, example: "grover" });
  });

  it("never overwrites a visitor's edited copy", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ source: "my own scoring", example: null, version: null }),
    );
    expect(readFitnessSource()).toBe("my own scoring");
  });
});
