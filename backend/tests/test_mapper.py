"""Behavioral tests for the traced mapping API."""

import pytest

from backend.engine.mapper import (
    decode_binary_genome,
    map_with_trace,
    prepare_genome,
    validate_grammar,
)
from backend.schemas import GEParams
from backend.tests._cases import GRAMMARS


def _params(**overrides: object) -> GEParams:
    base: dict[str, object] = {
        "consumption": "eager",
        "genome_representation": "codons",
        "max_depth": 40,
    }
    base.update(overrides)
    return GEParams(**base)


def test_eager_trace_is_complete() -> None:
    response = map_with_trace(
        GRAMMARS["arithmetic"], [153, 127, 92, 357, 399, 124, 41, 294, 153, 268, 253, 175], _params()
    )
    assert response.status == "complete"
    assert response.trace
    assert all(step.consumed for step in response.trace)  # eager consumes for every expansion
    assert response.trace[-1].partial_phenotype == response.phenotype
    assert response.trace[-1].complete is True
    assert response.summary["used_codons"] > 0


def test_lazy_skips_single_option_rules() -> None:
    response = map_with_trace(
        GRAMMARS["single_rule"], [1, 2, 3], _params(consumption="lazy", max_depth=20)
    )
    assert response.status == "complete"
    assert response.phenotype == "x z"
    consumed = [step.consumed for step in response.trace]
    assert consumed == [False, False, False, True]
    assert response.summary["used_codons"] == 1


def test_depth_limit_is_reported() -> None:
    response = map_with_trace(
        GRAMMARS["recursive"], [0, 0, 0, 0, 0, 0], _params(max_depth=3)
    )
    assert response.status == "depth-limited"
    assert response.trace
    assert response.trace[-1].complete is False


def test_exhausted_genome_is_invalid() -> None:
    response = map_with_trace(GRAMMARS["arithmetic"], [1], _params())
    assert response.status == "invalid"
    assert response.trace
    assert response.trace[-1].complete is False


def test_empty_genome_is_invalid() -> None:
    response = map_with_trace(GRAMMARS["arithmetic"], [], _params())
    assert response.status == "invalid"
    assert response.trace == []


def test_wrap_extension_completes_short_genome() -> None:
    params = _params(max_depth=40, wrap=False)
    without_wrap = map_with_trace(GRAMMARS["wrap_pair"], [0], params)
    assert without_wrap.status == "invalid"

    with_wrap = map_with_trace(GRAMMARS["wrap_pair"], [0], params.model_copy(update={"wrap": True}))
    assert with_wrap.status == "complete"
    assert with_wrap.phenotype == "x x"
    assert with_wrap.summary["n_wraps"] == 2


def test_trace_steps_are_ordered_and_consistent() -> None:
    response = map_with_trace(GRAMMARS["arithmetic"], [7, 3, 12, 9, 1, 5, 2], _params())
    steps = response.trace
    assert [step.step for step in steps] == list(range(len(steps)))
    for step in steps:
        assert step.rule_count >= 1
        assert 0 <= step.choice < step.rule_count
        assert step.codon_value >= 0
    # The partial phenotype sequence should build toward the final phenotype.
    for prev, curr in zip(steps, steps[1:]):
        assert curr.partial_phenotype != prev.partial_phenotype


def test_binary_decode_msb_first() -> None:
    assert decode_binary_genome([1, 0, 1, 0, 1, 0, 1, 0, 1], 8) == [170]
    assert decode_binary_genome([1, 1, 1, 1, 0, 0, 0, 0], 4) == [15, 0]


def test_binary_genome_mapping_returns_decoded_codons() -> None:
    response = map_with_trace(
        GRAMMARS["arithmetic"],
        [1, 0, 1, 0, 1, 0, 1, 0],
        _params(genome_representation="binary"),
    )
    assert response.genome == [170]


def test_binary_genome_rejects_non_bits() -> None:
    with pytest.raises(ValueError, match="only contain 0 and 1"):
        prepare_genome([0, 2], _params(genome_representation="binary"))


def test_validate_grammar_empty() -> None:
    result = validate_grammar("   ")
    assert result["valid"] is False
    assert "empty" in result["error"]
