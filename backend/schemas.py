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


class EvolvedIndividual(BaseModel):
    genome: list[int]
    phenotype: str
    fitness: float
    invalid: bool


class GenerationStats(BaseModel):
    gen: int
    best_fitness: float
    mean_fitness: float
    worst_fitness: float
    valid_count: int
    best: EvolvedIndividual
    top: list[EvolvedIndividual]


class EvolutionDone(BaseModel):
    generations: int
    best_fitness: float
    best: EvolvedIndividual


class EvolutionConfig(BaseModel):
    grammar_text: str
    problem: Literal["string_match", "symbolic_regression"] = "string_match"
    target: str = ""
    samples: list[float] = []
    coeffs: list[float] = []
    population_size: int = Field(default=100, ge=2)
    generations: int = Field(default=20, ge=1)
    p_crossover: float = Field(default=0.8, ge=0.0, le=1.0)
    p_mutation: float = Field(default=0.1, ge=0.0, le=1.0)
    elite_size: int = Field(default=1, ge=0)
    tournament_size: int = Field(default=3, ge=2)
    codon_size: int = Field(default=400, ge=2)
    max_depth: int = Field(default=40, ge=1)
    min_init_genome_length: int = Field(default=5, ge=1)
    max_init_genome_length: int = Field(default=20, ge=1)
    max_genome_length: int | None = None
    consumption: Literal["eager", "lazy"] = "eager"
    top_k: int = Field(default=20, ge=1)
    seed: int = 42
    early_stop: bool = True
