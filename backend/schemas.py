"""Frozen API contracts for GE Visualizer.

Single source of truth for the inter-module interface. `frontend/src/types.ts`
mirrors these types exactly; changing either side requires re-planning (Phase 0
of the development plan).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GEParams(BaseModel):
    codon_size: int = 400
    bits_per_codon: int = 8
    consumption: Literal["eager", "lazy"]
    max_depth: int = 40
    genome_representation: Literal["binary", "codons"]
    wrap: bool = False


class GrammarUpload(BaseModel):
    grammar_text: str


class MapRequest(BaseModel):
    grammar_text: str
    genome: list[int]
    params: GEParams


class TraceStep(BaseModel):
    step: int
    non_terminal: str
    codon_index: int
    codon_value: int
    rule_count: int
    choice: int
    expansion: str
    partial_phenotype: str
    depth: int
    wraps: int
    consumed: bool
    complete: bool


class DerivationNode(BaseModel):
    id: str
    label: str
    kind: Literal["root", "nonterminal", "terminal"]
    step: int | None = None
    codon_index: int | None = None
    choice: int | None = None
    children: list[DerivationNode] = Field(default_factory=list)


DerivationNode.model_rebuild()


class MapResponse(BaseModel):
    genome: list[int]
    params: GEParams
    trace: list[TraceStep]
    phenotype: str
    status: Literal["complete", "invalid", "depth-limited"]
    summary: dict
