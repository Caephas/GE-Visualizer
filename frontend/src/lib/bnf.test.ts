import { describe, expect, it } from "vitest";

import { GRAMMAR_ARITHMETIC } from "../examples/grammars";
import { parseBnf } from "./bnf";

describe("parseBnf", () => {
  it("parses rules and productions", () => {
    const rules = parseBnf(GRAMMAR_ARITHMETIC);
    expect(rules.map((rule) => rule.nonTerminal)).toEqual(["<expr>", "<term>", "<factor>", "<var>"]);
    expect(rules[0].productions).toEqual(["<term>", "<expr> + <term>", "<expr> - <term>"]);
    expect(rules[3].productions).toHaveLength(5);
  });

  it("ignores non-rule lines", () => {
    expect(parseBnf("hello\n<start> ::= a | b\n")).toEqual([
      { nonTerminal: "<start>", productions: ["a", "b"] },
    ]);
  });
});
