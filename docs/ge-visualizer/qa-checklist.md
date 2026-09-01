# GE Visualizer — QA checklist

Status: v1.0 · date: 2026-09-01 · suite: 36 backend tests + 70 frontend tests + live e2e smoke.

## Automated evidence

### Acceptance criteria

| AC | Criterion | Evidence |
|----|-----------|----------|
| AC-1 | Load/edit BNF grammar with examples and validation errors | `GrammarPanel` component tests; `/map` 400 on malformed grammar (`test_api.py`) |
| AC-2 | Genome editing in binary or codon form, consistent representations | `encoding.test.ts` round-trips; `GenomeEditor` bit-toggle test |
| AC-3 | Step-through with synchronized highlights | Reducer tests (`state.test.ts`), playback hook tests, live `/map` trace |
| AC-4 | Tree grows in sync and matches phenotype | `derivation.test.ts` builds exact tree from trace; trace ends at phenotype |
| AC-5 | Edge cases visible (depth limit, invalid, eager/lazy, wrap) | `test_mapper.py` statuses + flags; `StatusBanner` tests; live depth-limited run |
| AC-6 | Evolution playground with drill-down | `test_evolution.py` seeded convergence; `EvolutionPanel` drill-down test |
| AC-7 | URL shareable state + local grammar library | `serialization.test.ts`, `useUrlState.test.tsx`, `GrammarLibrary` tests |
| AC-8 | Responsive, keyboard-accessible, dark themed | `:focus-visible` + media queries; `Controls` keyboard tests |
| AC-9 | Runs locally with two processes, no external services | README quickstart; e2e smoke via `127.0.0.1` only |
| AC-10 | Traced mapper matches unpatched grape-bds | `test_parity.py` (live + golden fixtures) |

### Functional requirements

| FR | Covered by |
|----|------------|
| FR-01 | GrammarPanel tests, `/grammar` route tests |
| FR-02 | GRAPE `Grammar` parsing via mapper tests + golden fixtures |
| FR-03 | encoding tests, GenomeEditor tests, backend binary decode tests |
| FR-04 | test_mapper (eager/lazy/depth/wrap), parity suite |
| FR-05 | TraceStep schema test, parity trace invariants |
| FR-06 | derivation layout tests, tree render tests |
| FR-07 | state reducer stepping tests, usePlayback tests, Controls keyboard tests |
| FR-08 | StepDetail tests (arithmetic + lazy skip) |
| FR-09 | test_mapper edge cases, StatusBanner tests, wrap badge tests |
| FR-10 | test_evolution convergence + event shape, EvolutionPanel tests, live SSE |
| FR-11 | serialization round-trip, URL hook tests, library save/load/export/import |
| FR-12 | responsive CSS, focus-visible, Controls keyboard, panel empty/error states |

### Schema mirror

- `frontend/src/test/schema-mirror.test.ts` pins pydantic JSON schemas (exported by
  `tools/export_schemas.py`) and the TS interfaces to the same frozen key sets.
- Regenerate after any contract change: `python tools/export_schemas.py`.

## Manual browser check

- [ ] Open http://localhost:5173 with both processes running; the default arithmetic
  grammar maps automatically and the tree renders.
- [ ] Step forward/back and jump via slider; genome, grammar rule, tree node, and
  step card highlight the same step.
- [ ] Press space to play; adjust speed; arrows step; Home/End jump. Typing in the
  grammar textarea does not trigger shortcuts.
- [ ] Edit a codon and a parameter; the mapping re-runs (debounced) without error.
- [ ] Set max depth to a small value on a recursive grammar → depth-limit banner appears.
- [ ] Enable wrap on a short genome → wrap badge appears.
- [ ] Run evolution (string match, target `abc`, string grammar) → chart and table
  update live; click Load on a row → dashboard shows that genome.
- [ ] Copy the URL into a new tab → same grammar/genome/params/step restored.
- [ ] Save a grammar to the library, reload the page, load it back.
- [ ] Narrow the window below 1100px → single-column layout with no overflow.
- [ ] Tab through the controls → visible focus outlines.
