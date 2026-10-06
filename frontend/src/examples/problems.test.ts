import { describe, expect, it } from "vitest";

import { TOY_PROBLEMS } from "./problems";

describe("toy problems", () => {
  it("defines both problems with defaults", () => {
    expect(TOY_PROBLEMS.map((problem) => problem.id)).toEqual(["string_match", "symbolic_regression"]);
    expect(TOY_PROBLEMS[0].defaultTarget).toBe("abcabc");
    expect(TOY_PROBLEMS[1].defaultCoeffs).toEqual([0, 1, 1]);
    expect(TOY_PROBLEMS[1].defaultSamples).toHaveLength(19);
  });

  it("suggests a grammar that can express each problem", () => {
    for (const problem of TOY_PROBLEMS) {
      expect(problem.recommendedGrammar).toContain("::=");
      expect(problem.recommendedGrammarName.length).toBeGreaterThan(0);
    }
  });
});
