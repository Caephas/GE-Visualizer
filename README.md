# GE Visualizer

Interactive visualization of Grammatical Evolution (GE): load a BNF grammar, generate or edit
a genome, and watch — step by step — how codons are consumed, how `codon % #choices` selects
production rules, how the derivation tree is constructed, and how the final phenotype emerges.
The mapping is executed by the real GRAPE library (`grape-bds`, instrumented to emit a full
per-step trace), and an optional GRAPE + DEAP evolution playground searches for phenotypes that
solve toy problems.

## Features

- Live step-through of the genotype → phenotype mapping: synchronized highlights across the
  grammar rules, codon strip, derivation tree, and partial phenotype
- Playback with adjustable speed, keyboard shortcuts (`space`, arrows, `Home`, `End`)
- Binary and codon genome editing with lossless representation switching
- Eager/lazy codon consumption, depth limits, and optional genome wrapping, with clear
  explanations when a derivation stops
- Evolution playground: string match and symbolic regression problems with per-generation
  fitness charts and one-click drill-down into any individual
- Shareable state via URL query parameters, plus a local grammar library with export/import

## Quickstart

### Backend (FastAPI + grape-bds)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

Health check: http://127.0.0.1:8000/health-check

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` requests to the backend at
`http://127.0.0.1:8000`.

## Tests

```bash
# backend (36 tests: mapping parity vs unpatched grape-bds, golden fixtures, evolution)
pytest

# frontend (58 tests: engine view logic, components, playback, URL state)
cd frontend && npm test && npm run typecheck && npm run lint && npm run build
```

## Project structure

- `backend/` — FastAPI app; `engine/grape_traced.py` is a vendored, instrumented copy of GRAPE
  (`grape-bds` 0.1.3, BSD-3-Clause — see `THIRD_PARTY_NOTICES.md`); `engine/mapper.py` exposes
  the trace API; `engine/evolution.py` runs the GRAPE/DEAP playground
- `frontend/` — React + TypeScript dashboard: `lib/` holds pure view logic (derivation tree,
  BNF display parsing, encoding, serialization), `components/` the panels
- `docs/ge-visualizer/development-plan.md` — the phased plan (Phases 0–7 complete)
- `docs/ge-visualizer/qa-checklist.md` — acceptance-criteria evidence and manual checklist
- `tools/reference_mapper.py` — regenerates golden fixtures from unpatched `grape-bds`
- `tools/export_schemas.py` — regenerates the schema-mirror fixture for the frontend
- `tools/e2e_smoke.py` — end-to-end smoke test against a running stack

## End-to-end smoke test

With both processes running:

```bash
python tools/e2e_smoke.py                                    # direct to the backend
python tools/e2e_smoke.py --base http://localhost:5173/api   # through the Vite proxy
```

## Deployment

The frontend is a static build (`cd frontend && npm run build`, serve `dist/`) and the backend
is a single FastAPI process. Point the static server at the backend (same origin or CORS).
Docker is intentionally not included — two local processes are all this project needs.

## License note

This project vendors a modified copy of GRAPE's `grape.py` (BSD-3-Clause, copyright BDS Research
Group at University of Limerick) for per-step trace instrumentation. The unpatched pip package
remains the parity oracle.
