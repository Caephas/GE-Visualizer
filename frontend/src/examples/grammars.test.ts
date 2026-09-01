import { describe, expect, it } from "vitest";

import { EXAMPLE_GRAMMARS, GRAMMAR_ARITHMETIC, GRAMMAR_BOOLEAN, GRAMMAR_STRING } from "./grammars";

describe("example grammars", () => {
  it("exports three built-in grammars", () => {
    expect(EXAMPLE_GRAMMARS).toHaveLength(3);
  });

  it.each([
    ["arithmetic", GRAMMAR_ARITHMETIC],
    ["boolean", GRAMMAR_BOOLEAN],
    ["string", GRAMMAR_STRING],
  ])("%s grammar is non-empty BNF", (_name, grammar) => {
    expect(grammar).toContain("::=");
  });
});
