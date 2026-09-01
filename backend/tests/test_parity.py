"""Parity tests: traced mappers vs unpatched grape-bds and golden fixtures."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import grape as reference_grape
import pytest

from backend.engine import grape_traced
from backend.engine.mapper import grammar_from_text
from backend.tests._cases import CASES

FIXTURES_DIR = Path(__file__).parent / "fixtures"

OUTCOME_KEYS = ("phenotype", "used_codons", "nodes", "depth", "invalid", "n_wraps", "structure")


def _reference_outcome(grammar_text: str, genome: list[int], consumption: str, max_depth: int) -> dict:
    fd, path = tempfile.mkstemp(suffix=".bnf", text=True)
    try:
        with os.fdopen(fd, "w") as handle:
            handle.write(grammar_text)
        grammar = reference_grape.Grammar(path)
    finally:
        os.unlink(path)
    individual = reference_grape.Individual(genome, grammar, max_depth, consumption)
    return {
        "phenotype": individual.phenotype,
        "used_codons": individual.used_codons,
        "nodes": individual.nodes,
        "depth": individual.depth,
        "invalid": individual.invalid,
        "n_wraps": individual.n_wraps,
        "structure": list(individual.structure),
    }


def _traced_outcome(grammar_text: str, genome: list[int], consumption: str, max_depth: int) -> dict:
    grammar = grammar_from_text(grammar_text)
    mapper = grape_traced.mapper_eager if consumption == "eager" else grape_traced.mapper_lazy
    phenotype, nodes, depth, used_codons, invalid, n_wraps, structure, steps, depth_limited = mapper(
        genome, grammar, max_depth
    )
    return {
        "phenotype": phenotype,
        "used_codons": used_codons,
        "nodes": nodes,
        "depth": depth,
        "invalid": invalid,
        "n_wraps": n_wraps,
        "structure": list(structure),
        "steps": steps,
        "depth_limited": depth_limited,
    }


@pytest.mark.parametrize("case", CASES, ids=[case["case_id"] for case in CASES])
def test_traced_matches_live_unpatched_grape(case: dict) -> None:
    reference = _reference_outcome(case["grammar"], case["genome"], case["consumption"], case["max_depth"])
    traced = _traced_outcome(case["grammar"], case["genome"], case["consumption"], case["max_depth"])
    for key in OUTCOME_KEYS:
        assert traced[key] == reference[key], key
    assert traced["steps"], "trace should be non-empty"
    assert traced["steps"][-1]["partial_phenotype"] == traced["phenotype"]
    if traced["invalid"]:
        assert traced["steps"][-1]["complete"] is False
    else:
        assert traced["steps"][-1]["complete"] is True


def _fixtures() -> list[Path]:
    if not FIXTURES_DIR.exists():
        return []
    return sorted(FIXTURES_DIR.glob("*.json"))


@pytest.mark.parametrize("fixture_path", _fixtures(), ids=[path.stem for path in _fixtures()])
def test_traced_matches_golden_fixture(fixture_path: Path) -> None:
    fixture = json.loads(fixture_path.read_text())
    assert fixture["case_id"] == fixture_path.stem
    traced = _traced_outcome(
        fixture["grammar"], fixture["genome"], fixture["consumption"], fixture["max_depth"]
    )
    for key in OUTCOME_KEYS:
        assert traced[key] == fixture["expected"][key], key


def test_fixtures_cover_all_cases() -> None:
    fixture_ids = {path.stem for path in _fixtures()}
    case_ids = {case["case_id"] for case in CASES}
    assert fixture_ids == case_ids
