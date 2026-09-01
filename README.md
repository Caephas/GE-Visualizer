# GE Visualizer

Interactive visualization of Grammatical Evolution (GE): watch a BNF grammar, genome, and
codons map step by step into a derivation tree and phenotype — with the real GRAPE library
(`grape-bds`) doing the mapping server-side.

Status: **Phase 0 — scaffold**. Roadmap: [docs/ge-visualizer/development-plan.md](docs/ge-visualizer/development-plan.md)

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

Vite proxies `/api` requests to the backend at `http://127.0.0.1:8000`.

### Tests

```bash
# backend
pytest

# frontend
cd frontend && npm test && npm run typecheck && npm run build
```
