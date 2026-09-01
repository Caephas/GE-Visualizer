import { describe, expect, it } from "vitest";

import {
  EXAMPLE_GRAMMARS,
  GRAMMAR_ARITHMETIC,
  GRAMMAR_BOOLEAN,
  GRAMMAR_GROVER,
  GRAMMAR_STRING,
} from "./grammars";

describe("example grammars", () => {
  it("exports four built-in grammars", () => {
    expect(EXAMPLE_GRAMMARS).toHaveLength(4);
  });

  it.each([
    ["arithmetic", GRAMMAR_ARITHMETIC],
    ["boolean", GRAMMAR_BOOLEAN],
    ["string", GRAMMAR_STRING],
    ["grover", GRAMMAR_GROVER],
  ])("%s grammar is non-empty BNF", (_name, grammar) => {
    expect(grammar).toContain("::=");
  });

  it("keeps the Grover grammar's quoted newline terminals intact", () => {
    expect(GRAMMAR_GROVER).toContain('"qc.h(0)\\n"');
  });
});
