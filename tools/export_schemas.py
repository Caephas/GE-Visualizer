#!/usr/bin/env python
"""Export pydantic JSON schemas for the frontend schema-mirror test.

Usage (from the repo root, with the project venv active):
    python tools/export_schemas.py

Writes frontend/src/test/schemas.json, which the frontend test suite compares
against the frozen TypeScript contracts in frontend/src/types.ts.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.schemas import (
    DerivationNode,
    EvolutionConfig,
    GEParams,
    MapRequest,
    MapResponse,
    TraceStep,
)

OUT = REPO_ROOT / "frontend" / "src" / "test" / "schemas.json"

MODELS = {
    "GEParams": GEParams,
    "MapRequest": MapRequest,
    "TraceStep": TraceStep,
    "DerivationNode": DerivationNode,
    "MapResponse": MapResponse,
    "EvolutionConfig": EvolutionConfig,
}


def main() -> None:
    schemas = {name: model.model_json_schema() for name, model in MODELS.items()}
    OUT.write_text(json.dumps(schemas, indent=2) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
