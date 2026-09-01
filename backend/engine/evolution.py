"""GRAPE + DEAP evolution service for the visualizer playground."""

from __future__ import annotations

import copy
import random
import re
from collections.abc import Iterator

import grape as reference_grape
import numpy as np
from deap import base, creator, tools

from backend.engine.mapper import grammar_from_text
from backend.schemas import EvolutionConfig

_PENALTY = 1e6


def _ensure_creator() -> None:
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", reference_grape.Individual, fitness=creator.FitnessMin)


def _string_match_fitness(phenotype: str, target: str) -> float:
    if not target:
        return 0.0
    cleaned = re.sub(r"\s+", "", phenotype)
    score = abs(len(cleaned) - len(target)) * 2
    for left, right in zip(cleaned, target):
        if left != right:
            score += 1
    return float(score)


def _symbolic_regression_fitness(phenotype: str, samples: list[float], coeffs: list[float]) -> float:
    expression = phenotype.strip()
    if not re.fullmatch(r"[0-9x+\-*/().\s]+", expression):
        return _PENALTY
    try:
        total = 0.0
        for x in samples:
            target = sum(coeff * (x**i) for i, coeff in enumerate(coeffs))
            actual = eval(expression, {"__builtins__": {}}, {"x": x})
            total += (actual - target) ** 2
        return total / len(samples)
    except Exception:
        return _PENALTY


def build_fitness(config: EvolutionConfig):
    if config.problem == "string_match":
        target = config.target or "hello"
        return lambda phenotype: _string_match_fitness(phenotype, target)
    samples = config.samples or [round(-0.9 + 0.1 * i, 6) for i in range(19)]
    coeffs = config.coeffs or [0.0, 1.0, 1.0, 1.0, 1.0]
    return lambda phenotype: _symbolic_regression_fitness(phenotype, samples, coeffs)


def _individual_payload(individual) -> dict:
    return {
        "genome": list(individual.genome),
        "phenotype": individual.phenotype,
        "fitness": float(individual.fitness.values[0]),
        "invalid": bool(individual.invalid),
    }


def evolution_events(config: EvolutionConfig) -> Iterator[dict]:
    """Run a GRAPE/DEAP GA, yielding a generation event per generation and a final done event."""
    _ensure_creator()
    random.seed(config.seed)
    np.random.seed(config.seed)

    grammar = grammar_from_text(config.grammar_text)
    fitness_fn = build_fitness(config)

    toolbox = base.Toolbox()
    toolbox.register("mate", reference_grape.crossover_onepoint)
    toolbox.register("mutate", reference_grape.mutation_int_flip_per_codon)
    toolbox.register("clone", copy.deepcopy)
    toolbox.register("select", tools.selTournament, tournsize=config.tournament_size)

    population = reference_grape.random_initialisation(
        creator.Individual,
        config.population_size,
        grammar,
        config.min_init_genome_length,
        config.max_init_genome_length,
        config.max_depth,
        config.codon_size,
        config.consumption,
        "list",
    )
    for individual in population:
        individual.fitness.values = (fitness_fn(individual.phenotype),)

    best_overall = None
    for generation in range(1, config.generations + 1):
        elite = sorted(population, key=lambda ind: ind.fitness.values[0])[: config.elite_size]

        offspring = toolbox.select(population, config.population_size)
        offspring = [toolbox.clone(ind) for ind in offspring]
        for index in range(1, len(offspring), 2):
            if random.random() < config.p_crossover:
                offspring[index - 1], offspring[index] = toolbox.mate(
                    offspring[index - 1],
                    offspring[index],
                    grammar,
                    config.max_depth,
                    config.consumption,
                    "list",
                    config.max_genome_length,
                )
        for index in range(len(offspring)):
            offspring[index], = toolbox.mutate(
                offspring[index],
                config.p_mutation,
                config.codon_size,
                grammar,
                config.max_depth,
                config.consumption,
                config.max_genome_length,
            )
        for individual in offspring:
            individual.fitness.values = (fitness_fn(individual.phenotype),)

        population = offspring[: config.population_size - config.elite_size] + elite

        best = min(population, key=lambda ind: ind.fitness.values[0])
        if best_overall is None or best.fitness.values[0] < best_overall.fitness.values[0]:
            best_overall = best
        fits = [ind.fitness.values[0] for ind in population]
        top = sorted(population, key=lambda ind: ind.fitness.values[0])[: config.top_k]
        yield {
            "type": "generation",
            "gen": generation,
            "best_fitness": best.fitness.values[0],
            "mean_fitness": sum(fits) / len(fits),
            "worst_fitness": max(fits),
            "valid_count": sum(1 for ind in population if not ind.invalid),
            "best": _individual_payload(best),
            "top": [_individual_payload(ind) for ind in top],
        }
        if config.early_stop and best.fitness.values[0] <= 1e-9:
            break

    if best_overall is None:
        best_overall = min(population, key=lambda ind: ind.fitness.values[0])
    yield {
        "type": "done",
        "generations": generation,
        "best_fitness": best_overall.fitness.values[0],
        "best": _individual_payload(best_overall),
    }
