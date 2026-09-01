#!/usr/bin/env python
"""Regenerate golden fixtures from the unpatched grape-bds package.

Usage (from the repo root, with the project venv active):
    python tools/reference_mapper.py             # regenerate all fixtures
    python tools/reference_mapper.py --case <id> # regenerate one case

Each fixture stores the inputs and the outcomes produced by the unpatched
reference implementation; backend tests replay the same inputs through the
traced mapper and assert parity.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

import grape  # noqa: E402  (unpatched reference implementation)

from backend.tests._cases import CASES  # noqa: E402

FIXTURES_DIR = REPO_ROOT / "backend" / "tests" / "fixtures"


def reference_outcome(grammar_text: str, genome: list[int], consumption: str, max_depth: int) -> dict:
    fd, path = tempfile.mkstemp(suffix=".bnf", text=True)
    try:
        with os.fdopen(fd, "w") as handle:
            handle.write(grammar_text)
        grammar = grape.Grammar(path)
    finally:
        os.unlink(path)
    individual = grape.Individual(genome, grammar, max_depth, consumption)
    return {
        "phenotype": individual.phenotype,
        "used_codons": individual.used_codons,
        "nodes": individual.nodes,
        "depth": individual.depth,
        "invalid": individual.invalid,
        "n_wraps": individual.n_wraps,
        "structure": list(individual.structure),
    }


def generate(case_id: str | None = None) -> list[Path]:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for case in CASES:
        if case_id and case["case_id"] != case_id:
            continue
        expected = reference_outcome(
            case["grammar"], case["genome"], case["consumption"], case["max_depth"]
        )
        fixture = {
            "case_id": case["case_id"],
            "grammar": case["grammar"],
            "genome": case["genome"],
            "consumption": case["consumption"],
            "max_depth": case["max_depth"],
            "expected": expected,
        }
        target = FIXTURES_DIR / f"{case['case_id']}.json"
        target.write_text(json.dumps(fixture, indent=2) + "\n")
        written.append(target)
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Regenerate golden fixtures from unpatched grape-bds.")
    parser.add_argument("--case", help="Regenerate only this case id.")
    args = parser.parse_args()
    for path in generate(args.case):
        print(f"wrote {path}")
