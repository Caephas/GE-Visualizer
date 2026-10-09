# Changelog

Notable changes to the GE Visualizer. This project follows
[semantic versioning](https://semver.org) loosely: the minor version moves with
each release, and the mapping contract in `frontend/src/types.ts` is the piece
that would justify a major bump.

## 1.1.0 — browser-native release

The mapping and the evolution now run entirely in the browser, with no server.
The FastAPI backend and its test suite were removed; the Python engine lives in
`frontend/src/engine/` and runs under Pyodide.

**Engine**

- The real, instrumented GRAPE (`grape_core.py`) runs under Pyodide, with the
  numpy dependency removed and a fix for an internal tuple-unpacking bug.
- A trimmed, pure-Python DEAP subset (`deap_lite.py`) provides the operators the
  evolution loop needs.
- `ge_bridge.py` exposes JSON entry points: `validate`, `map`, `suggest`,
  `analyse`, `explain`, `check_fitness`, `evolve_start` / `evolve_next`.
- Grammars that previously hung the parser (no terminating derivation) are now
  rejected with an explanation, and undefined symbols are reported clearly.

**Teaching features**

- Interactive spotlight tour, and a Guide panel covering every control.
- "Suggest working settings": computes, from the grammar alone, a genome and
  depth that complete it, and reports what each consumption mode needs.
- Target reachability: says before a run whether the grammar can derive the
  target at all, and which characters make it impossible.
- Custom Python fitness functions, with a live check as you type and a bundled
  Grover objective that scores how well a generated circuit finds `|101>`.

**Interface**

- Export the derivation: the tree as SVG or PNG, and the step trace as text or
  CSV.
- In-app feedback that opens a prefilled GitHub issue.
- Responsive layout down to small phones, with pinch-to-zoom on the tree.
- Resizable panels (grammar sidebar and every panel in the main column), with
  sizes remembered locally.
- Link previews: Open Graph and Twitter metadata, canonical URL, favicon.

**Infrastructure**

- Golden fixtures in `frontend/tests/fixtures/`, generated from the *unpatched*
  `grape-bds` package, replayed through the browser engine by
  `npm run verify:engine`.
- 134 frontend tests, plus `npm run check:responsive` for layout regressions.
- GitHub Actions workflow that tests, builds and deploys to GitHub Pages.
- MIT license, with third-party texts under `LICENSES/`.

## 1.0.0 — initial dashboard

First working version: a FastAPI backend running `grape-bds` with an
instrumented mapper, and a React dashboard with the grammar panel, genome
editor, step-through controls, derivation tree with pan and zoom, codon strip,
partial phenotype, and a GRAPE + DEAP evolution playground.
