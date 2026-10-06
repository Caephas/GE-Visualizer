/**
 * Verifies the in-browser GRAPE engine under real Pyodide.
 *
 * Loads the same Python sources the Web Worker ships (src/engine/*.py) into a
 * Pyodide runtime and checks:
 *   1. the mapper output matches the golden grape-bds fixtures
 *   2. grammar validation works
 *   3. a small GRAPE/DEAP evolution runs and streams per-generation events
 *
 * Run with: npm run verify:engine
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadPyodide } from "pyodide";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.join(here, "..", "src", "engine");
const fixturesDir = path.join(here, "..", "tests", "fixtures");

const py = await loadPyodide();

// Guard against a regression that hangs the engine (the script would otherwise
// wait forever, and so would the browser worker).
const watchdog = setTimeout(() => {
  console.error("FAIL engine did not finish within 120s — it is probably stuck");
  process.exit(1);
}, 120_000);

py.FS.mkdirTree("/engine");
for (const name of ["grape_core.py", "deap_lite.py", "ge_bridge.py"]) {
  py.FS.writeFile(`/engine/${name}`, await readFile(path.join(engineDir, name), "utf8"), {
    encoding: "utf8",
  });
}
py.runPython("import sys\nsys.path.insert(0, '/engine')\nimport ge_bridge");

const call = (fn, arg) => {
  py.globals.set("__arg", arg);
  return JSON.parse(py.runPython(`ge_bridge.${fn}(__arg)`));
};

let failures = 0;

// 1. Golden fixture parity
const { readdir } = await import("node:fs/promises");
for (const file of (await readdir(fixturesDir)).filter((f) => f.endsWith(".json")).sort()) {
  const fixture = JSON.parse(await readFile(path.join(fixturesDir, file), "utf8"));
  const result = call(
    "map_json",
    JSON.stringify({
      grammar_text: fixture.grammar,
      genome: fixture.genome,
      params: {
        codon_size: 400,
        bits_per_codon: 8,
        consumption: fixture.consumption,
        max_depth: fixture.max_depth,
        genome_representation: "codons",
        wrap: false,
      },
    }),
  );
  const expected = fixture.expected;
  const got = {
    phenotype: result.phenotype,
    used_codons: result.summary.used_codons,
    nodes: result.summary.nodes,
    depth: result.summary.depth,
    n_wraps: result.summary.n_wraps,
    invalid: result.status === "invalid" || result.status === "depth-limited",
  };
  const ok = Object.keys(got).every((key) => got[key] === expected[key]);
  console.log(`${ok ? "OK  " : "FAIL"} ${fixture.case_id} (status=${result.status}, steps=${result.trace.length})`);
  if (!ok) {
    failures += 1;
    for (const key of Object.keys(got)) {
      if (got[key] !== expected[key]) console.log(`      ${key}: got ${got[key]} expected ${expected[key]}`);
    }
  }
}

// 2. Grammar validation
const good = call("validate_json", "<start> ::= a | b");
const bad = call("validate_json", "definitely not a grammar");
if (good.valid && good.rules === 1 && !bad.valid) {
  console.log("OK   grammar validation");
} else {
  failures += 1;
  console.log("FAIL grammar validation", good, bad);
}

// 2a. Grammars that must fail fast instead of spinning: no terminating
// derivation, and symbols without a rule.
const nonTerminating = call("validate_json", "<start> ::= <start>");
const mutualRecursion = call("validate_json", "<a> ::= <b>\n<b> ::= <a>");
const undefinedSymbol = call("validate_json", "<a> ::= x | <b>");
if (
  !nonTerminating.valid &&
  /terminating derivation/i.test(nonTerminating.error ?? "") &&
  !mutualRecursion.valid &&
  /terminating derivation/i.test(mutualRecursion.error ?? "") &&
  !undefinedSymbol.valid &&
  /undefined non-terminal/i.test(undefinedSymbol.error ?? "")
) {
  console.log("OK   grammar error messages (non-terminating + undefined symbols)");
} else {
  failures += 1;
  console.log("FAIL grammar error messages", { nonTerminating, mutualRecursion, undefinedSymbol });
}

// 2b. Suggested settings must actually complete the grammar they came from.
const exampleGrammars = {
  arithmetic: [
    "<expr> ::= <term> | <expr> + <term> | <expr> - <term>",
    "<term> ::= <factor> | <term> * <factor> | <term> / <factor>",
    "<factor> ::= ( <expr> ) | <var>",
    "<var> ::= x | y | 1 | 2 | 3",
  ].join("\n"),
  boolean: [
    "<expr> ::= <term> | <expr> and <term> | <expr> or <term>",
    "<term> ::= <factor> | not <factor>",
    "<factor> ::= ( <expr> ) | <var>",
    "<var> ::= a | b | c | true | false",
  ].join("\n"),
  "string builder": "<start> ::= <char> | <char> <start>\n<char> ::= a | b | c",
  grover: await readFile(path.join(here, "..", "src", "examples", "grover.bnf"), "utf8"),
};

const suggestProblems = [];
for (const [name, grammar] of Object.entries(exampleGrammars)) {
  for (const mode of ["eager", "lazy"]) {
    const suggestion = call(
      "suggest_json",
      JSON.stringify({ grammar_text: grammar, consumption: mode }),
    );
    const mapped = call(
      "map_json",
      JSON.stringify({
        grammar_text: grammar,
        genome: suggestion.genome,
        params: {
          codon_size: 400,
          bits_per_codon: 8,
          consumption: mode,
          max_depth: suggestion.suggested_max_depth,
          genome_representation: "codons",
          wrap: false,
        },
      }),
    );
    if (mapped.status !== "complete" || mapped.phenotype !== suggestion.phenotype) {
      suggestProblems.push(`${name}/${mode} → ${mapped.status}`);
    }
  }
}
if (suggestProblems.length === 0) {
  console.log(
    `OK   suggested settings (${Object.keys(exampleGrammars).length} grammars × eager/lazy all complete)`,
  );
} else {
  failures += 1;
  console.log("FAIL suggested settings", suggestProblems);
}

// 2c. Target reachability must agree with what the mapper can actually produce.
const reach = (grammar, target) =>
  call("analyse_json", JSON.stringify({ grammar_text: grammar, target }));
const stringGrammar = "<start> ::= <char> | <char> <start>\n<char> ::= a | b | c";
const reachabilityCases = [
  ["derivable target", reach(stringGrammar, "abcabc").reachable, true],
  ["character not in the alphabet", reach(stringGrammar, "abz").reachable, false],
  ["names the missing character", reach(stringGrammar, "abz").missing.join(""), "z"],
  ["order matters", reach("<start> ::= a b", "ba").reachable, false],
  ["single production", reach("<start> ::= a b", "ab").reachable, true],
  ["empty target is undecided", reach(stringGrammar, "").reachable, null],
];
const reachabilityProblems = reachabilityCases.filter(([, actual, expected]) => actual !== expected);
if (reachabilityProblems.length === 0) {
  console.log("OK   target reachability");
} else {
  failures += 1;
  console.log("FAIL target reachability", reachabilityProblems);
}

// Every phenotype the mapper produces must be accepted by the reachability check.
let produced = 0;
let rejected = 0;
for (let seed = 0; seed < 60; seed += 1) {
  const genome = Array.from({ length: 12 }, (_, i) => (seed * 7 + i * 13) % 400);
  const mapped = call(
    "map_json",
    JSON.stringify({
      grammar_text: stringGrammar,
      genome,
      params: {
        codon_size: 400,
        bits_per_codon: 8,
        consumption: "eager",
        max_depth: 40,
        genome_representation: "codons",
        wrap: true,
      },
    }),
  );
  if (mapped.status !== "complete") continue;
  produced += 1;
  if (!reach(stringGrammar, mapped.phenotype).reachable) rejected += 1;
}
if (produced > 0 && rejected === 0) {
  console.log(`OK   reachability agrees with the mapper (${produced} produced phenotypes)`);
} else {
  failures += 1;
  console.log(`FAIL reachability disagreed with the mapper (${rejected} of ${produced})`);
}

// 2d. Fitness explanations (the "why this score?" breakdown)
const matchExplain = call(
  "explain_json",
  JSON.stringify({ config: { problem: "string_match", target: "abc" }, phenotype: "a b c" }),
);
const regressionConfig = { problem: "symbolic_regression", samples: [-0.5, 0, 0.5], coeffs: [0, 1, 1] };
const goodExplain = call(
  "explain_json",
  JSON.stringify({ config: regressionConfig, phenotype: "x + x * x" }),
);
const badExplain = call(
  "explain_json",
  JSON.stringify({ config: regressionConfig, phenotype: "y + 1" }),
);
if (
  matchExplain.fitness === 0 &&
  matchExplain.lines.some((line) => line.startsWith("Fitness = ")) &&
  goodExplain.fitness === 0 &&
  badExplain.fitness === 1e6
) {
  console.log("OK   fitness explanations");
} else {
  failures += 1;
  console.log("FAIL fitness explanations", { matchExplain, goodExplain, badExplain });
}

// 3. A short evolution run
const config = {
  grammar_text: "<start> ::= <char> | <char> <start>\n<char> ::= a | b | c",
  problem: "string_match",
  target: "abc",
  samples: [],
  coeffs: [],
  population_size: 30,
  generations: 8,
  p_crossover: 0.8,
  p_mutation: 0.1,
  elite_size: 1,
  tournament_size: 3,
  codon_size: 400,
  max_depth: 40,
  min_init_genome_length: 5,
  max_init_genome_length: 12,
  max_genome_length: null,
  consumption: "eager",
  top_k: 5,
  seed: 7,
  early_stop: true,
};
const { run } = call("evolve_start_json", JSON.stringify(config));
let events = 0;
let done = null;
for (;;) {
  const event = call("evolve_next_json", JSON.stringify(run));
  if (event === null) break;
  events += 1;
  if (event.type === "generation" && event.gen === 1) {
    console.log(`OK   evolution gen 1 (best=${event.best_fitness}, valid=${event.valid_count})`);
  }
  if (event.type === "done") done = event;
}
if (events > 0 && done) {
  console.log(`OK   evolution finished: ${done.generations} gens, best=${done.best_fitness}, phenotype=${JSON.stringify(done.best.phenotype)}`);
} else {
  failures += 1;
  console.log("FAIL evolution produced no done event");
}

console.log(failures === 0 ? "\nengine OK" : `\n${failures} FAILURE(S)`);
clearTimeout(watchdog);
process.exit(failures === 0 ? 0 : 1);
