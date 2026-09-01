"""Trace-aware mapping API built on the instrumented GRAPE mappers."""

from __future__ import annotations

import os
import tempfile

from backend.engine import grape_traced
from backend.schemas import GEParams, MapResponse, TraceStep


def grammar_from_text(grammar_text: str) -> grape_traced.Grammar:
    """Parse a BNF grammar exactly the way GRAPE does: from a file."""
    if not grammar_text or not grammar_text.strip():
        raise ValueError("Grammar is empty.")
    fd, path = tempfile.mkstemp(suffix=".bnf", text=True)
    try:
        with os.fdopen(fd, "w") as handle:
            handle.write(grammar_text)
        try:
            return grape_traced.Grammar(path)
        except IndexError as exc:
            raise ValueError(
                "No grammar rules found. Each rule must look like: <start> ::= production | production"
            ) from exc
        except Exception as exc:
            raise ValueError(f"Could not parse grammar ({type(exc).__name__}: {exc})") from exc
    finally:
        os.unlink(path)


def validate_grammar(grammar_text: str) -> dict:
    """Validate a BNF grammar and return a structured result for the UI."""
    try:
        grammar = grammar_from_text(grammar_text)
    except ValueError as exc:
        return {"valid": False, "rules": 0, "start_rule": None, "error": str(exc)}
    return {
        "valid": True,
        "rules": len(grammar.non_terminals),
        "start_rule": grammar.start_rule,
        "error": None,
    }


def decode_binary_genome(bits: list[int], bits_per_codon: int) -> list[int]:
    """Decode a bit-string genome into codon values (MSB-first).

    Partial trailing bits are truncated, matching the frozen contract.
    """
    if bits_per_codon < 1:
        raise ValueError("bits_per_codon must be at least 1.")
    full_bits = len(bits) - (len(bits) % bits_per_codon)
    codons: list[int] = []
    for start in range(0, full_bits, bits_per_codon):
        value = 0
        for bit in bits[start : start + bits_per_codon]:
            value = (value << 1) | bit
        codons.append(value)
    return codons


def prepare_genome(genome: list[int], params: GEParams) -> list[int]:
    """Return the codon list GRAPE will actually map."""
    if params.genome_representation == "binary":
        if any(bit not in (0, 1) for bit in genome):
            raise ValueError("Binary genomes may only contain 0 and 1.")
        return decode_binary_genome(genome, params.bits_per_codon)
    return genome


def map_with_trace(grammar_text: str, genome: list[int], params: GEParams) -> MapResponse:
    """Map a genome to a phenotype with GRAPE, returning the full per-step trace."""
    codons = prepare_genome(genome, params)
    grammar = grammar_from_text(grammar_text)

    if params.consumption == "eager":
        mapper = grape_traced.mapper_eager
    elif params.consumption == "lazy":
        mapper = grape_traced.mapper_lazy
    else:
        raise ValueError(f"Unknown consumption mode: {params.consumption}")

    phenotype, nodes, depth, used_codons, invalid, n_wraps, structure, steps, depth_limited = mapper(
        codons, grammar, params.max_depth, wrap=params.wrap
    )

    if depth_limited:
        status = "depth-limited"
    elif invalid:
        status = "invalid"
    else:
        status = "complete"

    return MapResponse(
        genome=codons,
        params=params,
        trace=[TraceStep(**step) for step in steps],
        phenotype=phenotype,
        status=status,
        summary={
            "used_codons": used_codons,
            "nodes": nodes,
            "depth": depth,
            "n_wraps": n_wraps,
        },
    )
