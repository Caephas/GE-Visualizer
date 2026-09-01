import groverGrammar from "./grover.bnf?raw";

export const GRAMMAR_ARITHMETIC = [
  "<expr> ::= <term> | <expr> + <term> | <expr> - <term>",
  "<term> ::= <factor> | <term> * <factor> | <term> / <factor>",
  "<factor> ::= ( <expr> ) | <var>",
  "<var> ::= x | y | 1 | 2 | 3",
].join("\n");

export const GRAMMAR_BOOLEAN = [
  "<expr> ::= <term> | <expr> and <term> | <expr> or <term>",
  "<term> ::= <factor> | not <factor>",
  "<factor> ::= ( <expr> ) | <var>",
  "<var> ::= a | b | c | true | false",
].join("\n");

export const GRAMMAR_STRING = [
  "<start> ::= <char> | <char> <start>",
  "<char> ::= a | b | c",
].join("\n");

export const GRAMMAR_GROVER = groverGrammar;

export interface ExampleGrammar {
  name: string;
  description: string;
  grammar: string;
}

export const EXAMPLE_GRAMMARS: ExampleGrammar[] = [
  {
    name: "Arithmetic expressions",
    description: "Classic expression grammar over x, y, and numbers.",
    grammar: GRAMMAR_ARITHMETIC,
  },
  {
    name: "Boolean logic",
    description: "and/or/not expressions over boolean variables.",
    grammar: GRAMMAR_BOOLEAN,
  },
  {
    name: "String builder",
    description: "Recursively builds strings from a, b, and c.",
    grammar: GRAMMAR_STRING,
  },
  {
    name: "Grover (3-qubit Qiskit)",
    description:
      "Full Grover search program generator. Codon-hungry — use a longer genome, wrap on, and a higher max depth.",
    grammar: GRAMMAR_GROVER,
  },
];
