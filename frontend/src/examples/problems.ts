import { GRAMMAR_STRING } from "./grammars";

export interface ToyProblem {
  id: "string_match" | "symbolic_regression";
  name: string;
  description: string;
  defaultTarget: string;
  defaultSamples: number[];
  defaultCoeffs: number[];
  /** A grammar this problem is known to work with, offered as a one-click fix. */
  recommendedGrammar: string;
  recommendedGrammarName: string;
}

/** Arithmetic over `x` only, so the regression demo isn't tripped up by `y`. */
export const GRAMMAR_REGRESSION = [
  "<expr> ::= <term> | <expr> + <term> | <expr> - <term>",
  "<term> ::= <factor> | <term> * <factor>",
  "<factor> ::= ( <expr> ) | x | 1 | 2 | 3",
].join("\n");

export const TOY_PROBLEMS: ToyProblem[] = [
  {
    id: "string_match",
    name: "String match",
    description: "Evolve a phenotype that matches the target string (whitespace in phenotypes is ignored).",
    defaultTarget: "abcabc",
    defaultSamples: [],
    defaultCoeffs: [],
    recommendedGrammar: GRAMMAR_STRING,
    recommendedGrammarName: "String builder",
  },
  {
    id: "symbolic_regression",
    name: "Symbolic regression",
    description: "Fit the polynomial x + x² over sample points. Use an arithmetic grammar over x.",
    defaultTarget: "",
    defaultSamples: Array.from({ length: 19 }, (_, index) => Number((-0.9 + 0.1 * index).toFixed(6))),
    defaultCoeffs: [0, 1, 1],
    recommendedGrammar: GRAMMAR_REGRESSION,
    recommendedGrammarName: "Arithmetic (over x)",
  },
];
