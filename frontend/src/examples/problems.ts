export interface ToyProblem {
  id: "string_match" | "symbolic_regression";
  name: string;
  description: string;
  defaultTarget: string;
  defaultSamples: number[];
  defaultCoeffs: number[];
}

export const TOY_PROBLEMS: ToyProblem[] = [
  {
    id: "string_match",
    name: "String match",
    description: "Evolve a phenotype that matches the target string (whitespace in phenotypes is ignored).",
    defaultTarget: "abcabc",
    defaultSamples: [],
    defaultCoeffs: [],
  },
  {
    id: "symbolic_regression",
    name: "Symbolic regression",
    description: "Fit the polynomial x + x² + x³ + x⁴ over sample points. Use an arithmetic grammar over x.",
    defaultTarget: "",
    defaultSamples: Array.from({ length: 19 }, (_, index) => Number((-0.9 + 0.1 * index).toFixed(6))),
    defaultCoeffs: [0, 1, 1, 1, 1],
  },
];
