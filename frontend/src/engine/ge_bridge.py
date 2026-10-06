"""Browser bridge: GRAPE mapping + GRAPE/DEAP evolution over JSON.

Imports the real (instrumented, numpy-free) GRAPE in grape_core.py and the
vendored DEAP subset in deap_lite.py, and exposes plain JSON-in / JSON-out
entry points so the Web Worker can call it without object marshalling.

    validate_json(text)            -> GrammarValidation
    map_json(request_json)         -> MapResponse
    evolve_start_json(config_json) -> {"run": <id>}
    evolve_next_json(run_id)       -> one evolution event, or None when done

Evolution is split into start/next so the worker can post one event to the UI
per generation while the GA keeps its state in a Python-side generator.
"""

from __future__ import annotations

import copy
import json
import random
import re

import grape_core
from deap_lite import base, creator, tools

_PENALTY = 1e6
_WS = re.compile(r"\s+")

_runs: dict[int, object] = {}
_run_seq = 0


# --------------------------------------------------------------------------- #
# Grammar + mapping
# --------------------------------------------------------------------------- #


def _grammar_from_text(grammar_text: str) -> grape_core.Grammar:
    if not grammar_text or not grammar_text.strip():
        raise ValueError("Grammar is empty.")
    try:
        return grape_core.Grammar(text=grammar_text)
    except IndexError as exc:
        raise ValueError(
            "No grammar rules found. Each rule must look like: "
            "<start> ::= production | production"
        ) from exc
    except grape_core.GrammarError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - surface any parse error to the UI
        raise ValueError(f"Could not parse grammar ({type(exc).__name__}: {exc})") from exc


def validate_grammar(grammar_text: str) -> dict:
    try:
        grammar = _grammar_from_text(grammar_text)
    except ValueError as exc:
        return {"valid": False, "rules": 0, "start_rule": None, "error": str(exc)}
    return {
        "valid": True,
        "rules": len(grammar.non_terminals),
        "start_rule": grammar.start_rule,
        "error": None,
    }


def decode_binary_genome(bits: list, bits_per_codon: int) -> list:
    if bits_per_codon < 1:
        raise ValueError("bits_per_codon must be at least 1.")
    full_bits = len(bits) - (len(bits) % bits_per_codon)
    codons = []
    for start in range(0, full_bits, bits_per_codon):
        value = 0
        for bit in bits[start : start + bits_per_codon]:
            value = (value << 1) | int(bit)
        codons.append(value)
    return codons


def prepare_genome(genome: list, params: dict) -> list:
    if params.get("genome_representation") == "binary":
        if any(bit not in (0, 1) for bit in genome):
            raise ValueError("Binary genomes may only contain 0 and 1.")
        return decode_binary_genome(genome, int(params.get("bits_per_codon", 8)))
    return list(genome)


def map_with_trace(grammar_text: str, genome: list, params: dict) -> dict:
    codons = prepare_genome(genome, params)
    grammar = _grammar_from_text(grammar_text)
    mapper = grape_core.mapper_lazy if params.get("consumption") == "lazy" else grape_core.mapper_eager

    phenotype, nodes, depth, used_codons, invalid, n_wraps, _structure, steps, depth_limited = mapper(
        codons, grammar, int(params.get("max_depth", 40)), wrap=bool(params.get("wrap", False))
    )

    if depth_limited:
        status = "depth-limited"
    elif invalid:
        status = "invalid"
    else:
        status = "complete"

    return {
        "genome": codons,
        "params": params,
        "trace": steps,
        "phenotype": phenotype,
        "status": status,
        "summary": {
            "used_codons": used_codons,
            "nodes": nodes,
            "depth": depth,
            "n_wraps": n_wraps,
        },
    }


def validate_json(grammar_text: str) -> str:
    return json.dumps(validate_grammar(grammar_text))


def map_json(request_json: str) -> str:
    request = json.loads(request_json)
    return json.dumps(
        map_with_trace(request["grammar_text"], request["genome"], request["params"])
    )


def explain_json(request_json: str) -> str:
    request = json.loads(request_json)
    return json.dumps(explain_fitness(request["config"], request["phenotype"]))


def suggest_json(request_json: str) -> str:
    request = json.loads(request_json)
    return json.dumps(suggest_settings(request["grammar_text"], request.get("consumption", "eager")))


def analyse_json(request_json: str) -> str:
    request = json.loads(request_json)
    return json.dumps(analyse_target(request["grammar_text"], request.get("target", "")))


# --------------------------------------------------------------------------- #
# Fitness
# --------------------------------------------------------------------------- #


def _ensure_creator() -> None:
    if not hasattr(creator, "FitnessMin"):
        creator.create("FitnessMin", base.Fitness, weights=(-1.0,))
    if not hasattr(creator, "Individual"):
        creator.create("Individual", grape_core.Individual, fitness=creator.FitnessMin)


def _string_match_detail(phenotype: str, target: str) -> dict:
    """Break the string-match score into its two components."""
    cleaned = re.sub(r"\s+", "", phenotype)
    length_penalty = abs(len(cleaned) - len(target)) * 2
    mismatches = sum(1 for left, right in zip(cleaned, target) if left != right)
    return {
        "cleaned": cleaned,
        "length_penalty": length_penalty,
        "mismatches": mismatches,
        "fitness": float(length_penalty + mismatches),
    }


def _string_match_fitness(phenotype: str, target: str) -> float:
    if not target:
        return 0.0
    return _string_match_detail(phenotype, target)["fitness"]


def _regression_detail(phenotype: str, samples: list, coeffs: list) -> dict:
    """Evaluate the phenotype against the target polynomial, keeping the reason on failure."""
    expression = phenotype.strip()
    if not re.fullmatch(r"[0-9x+\-*/().\s]+", expression):
        return {
            "ok": False,
            "reason": "the phenotype contains characters the evaluator does not allow",
            "fitness": _PENALTY,
        }
    try:
        total = 0.0
        for x in samples:
            target = sum(coeff * (x**i) for i, coeff in enumerate(coeffs))
            actual = eval(expression, {"__builtins__": {}}, {"x": x})
            total += (actual - target) ** 2
        mse = total / len(samples)
        return {"ok": True, "n": len(samples), "mse": mse, "fitness": mse}
    except Exception as exc:  # noqa: BLE001 - the reason is shown to the user
        return {"ok": False, "reason": f"{type(exc).__name__}: {exc}", "fitness": _PENALTY}


def _symbolic_regression_fitness(phenotype: str, samples: list, coeffs: list) -> float:
    return _regression_detail(phenotype, samples, coeffs)["fitness"]


def _build_fitness(config: dict):
    if config.get("problem") == "string_match":
        target = config.get("target") or "hello"
        return lambda phenotype: _string_match_fitness(phenotype, target)
    samples = config.get("samples") or [round(-0.9 + 0.1 * i, 6) for i in range(19)]
    coeffs = config.get("coeffs") or [0.0, 1.0, 1.0]
    return lambda phenotype: _symbolic_regression_fitness(phenotype, samples, coeffs)


def _poly_label(coeffs: list) -> str:
    terms = []
    for power, coeff in enumerate(coeffs):
        if coeff == 0:
            continue
        variable = "" if power == 0 else ("x" if power == 1 else f"x^{power}")
        if variable and coeff == 1:
            terms.append(variable)
        elif variable:
            terms.append(f"{coeff:g}*{variable}")
        else:
            terms.append(f"{coeff:g}")
    return " + ".join(terms) or "0"


def explain_fitness(config: dict, phenotype: str) -> dict:
    """Show the arithmetic behind a phenotype's fitness (the same maths as scoring)."""
    if config.get("problem") == "string_match":
        target = config.get("target") or "hello"
        detail = _string_match_detail(phenotype, target)
        lines = [
            f'Phenotype (whitespace removed): "{detail["cleaned"]}"',
            f'Target: "{target}"',
            f'Length penalty: |{len(detail["cleaned"])} - {len(target)}| x 2 = {detail["length_penalty"]}',
            f'Position mismatches: {detail["mismatches"]}',
            f'Fitness = {detail["length_penalty"]} + {detail["mismatches"]} = {detail["fitness"]:g}',
        ]
        return {"problem": "string_match", "fitness": detail["fitness"], "lines": lines}

    samples = config.get("samples") or [round(-0.9 + 0.1 * i, 6) for i in range(19)]
    coeffs = config.get("coeffs") or [0.0, 1.0, 1.0]
    detail = _regression_detail(phenotype, samples, coeffs)
    if detail["ok"]:
        lines = [
            f'Expression: "{phenotype.strip()}"',
            f'Target polynomial: {_poly_label(coeffs)}',
            f"Evaluated at {detail['n']} sample points",
            f"Mean squared error = {detail['mse']:g}",
            f"Fitness = {detail['fitness']:g}",
        ]
    else:
        lines = [
            f'Expression: "{phenotype.strip()}"',
            f"Could not evaluate it: {detail['reason']}",
            f"Fitness = {_PENALTY:g} (penalty)",
        ]
    return {"problem": "symbolic_regression", "fitness": detail["fitness"], "lines": lines}


def _individual_payload(individual) -> dict:
    return {
        "genome": list(individual.genome),
        "phenotype": individual.phenotype,
        "fitness": float(individual.fitness.values[0]),
        "invalid": bool(individual.invalid),
    }


def evolution_events(config: dict):
    """Run a GRAPE/DEAP GA, yielding a generation event per generation and a final done event."""
    _ensure_creator()
    random.seed(config.get("seed", 42))

    grammar = _grammar_from_text(config["grammar_text"])
    fitness_fn = _build_fitness(config)
    consumption = config.get("consumption", "eager")
    top_k = int(config.get("top_k", 20))

    toolbox = base.Toolbox()
    toolbox.register("mate", grape_core.crossover_onepoint)
    toolbox.register("mutate", grape_core.mutation_int_flip_per_codon)
    toolbox.register("clone", copy.deepcopy)
    toolbox.register("select", tools.selTournament, tournsize=int(config.get("tournament_size", 3)))

    population = grape_core.random_initialisation(
        creator.Individual,
        int(config["population_size"]),
        grammar,
        int(config["min_init_genome_length"]),
        int(config["max_init_genome_length"]),
        int(config["max_depth"]),
        int(config["codon_size"]),
        consumption,
        "list",
    )
    for individual in population:
        individual.fitness.values = (fitness_fn(individual.phenotype),)

    generations = int(config["generations"])
    elite_size = int(config.get("elite_size", 1))
    p_crossover = float(config.get("p_crossover", 0.8))
    p_mutation = float(config.get("p_mutation", 0.1))
    max_genome_length = config.get("max_genome_length")

    best_overall = None
    generation = 0
    for generation in range(1, generations + 1):
        elite = sorted(population, key=lambda ind: ind.fitness.values[0])[:elite_size]

        offspring = toolbox.select(population, len(population))
        offspring = [toolbox.clone(ind) for ind in offspring]
        for index in range(1, len(offspring), 2):
            if random.random() < p_crossover:
                offspring[index - 1], offspring[index] = toolbox.mate(
                    offspring[index - 1],
                    offspring[index],
                    grammar,
                    int(config["max_depth"]),
                    consumption,
                    "list",
                    max_genome_length,
                )
        for index in range(len(offspring)):
            (offspring[index],) = toolbox.mutate(
                offspring[index],
                p_mutation,
                int(config["codon_size"]),
                grammar,
                int(config["max_depth"]),
                consumption,
                max_genome_length,
            )
        for individual in offspring:
            individual.fitness.values = (fitness_fn(individual.phenotype),)

        population = offspring[: len(population) - elite_size] + elite

        best = min(population, key=lambda ind: ind.fitness.values[0])
        if best_overall is None or best.fitness.values[0] < best_overall.fitness.values[0]:
            best_overall = best
        fits = [ind.fitness.values[0] for ind in population]
        top = sorted(population, key=lambda ind: ind.fitness.values[0])[:top_k]
        yield {
            "type": "generation",
            "gen": generation,
            "best_fitness": float(best.fitness.values[0]),
            "mean_fitness": float(sum(fits) / len(fits)),
            "worst_fitness": float(max(fits)),
            "valid_count": int(sum(1 for ind in population if not ind.invalid)),
            "best": _individual_payload(best),
            "top": [_individual_payload(ind) for ind in top],
        }
        if config.get("early_stop", True) and best.fitness.values[0] <= 1e-9:
            break

    if best_overall is None:
        best_overall = min(population, key=lambda ind: ind.fitness.values[0])
    yield {
        "type": "done",
        "generations": generation,
        "best_fitness": float(best_overall.fitness.values[0]),
        "best": _individual_payload(best_overall),
    }


# --------------------------------------------------------------------------- #
# Suggested settings: the grammar alone determines what a derivation needs
# --------------------------------------------------------------------------- #


def _shortest_derivation(grammar, lazy: bool):
    """Cheapest complete derivation of the start rule: codon count, depth, choices.

    Costs are computed as a shortest-path fixpoint over the production rules —
    terminals cost nothing, and under `lazy` a rule with a single alternative
    costs no codon at all.
    """
    count = len(grammar.non_terminals)
    infinity = float("inf")
    codons = [infinity] * count
    depth = [infinity] * count
    choice = [None] * count

    changed = True
    while changed:
        changed = False
        for index in range(count):
            for alternative, production in enumerate(grammar.production_rules[index]):
                children = [
                    grammar.non_terminals.index('<' + name + '>')
                    for name in re.findall(r"\<([\(\)\w,-.]+)\>", production[0])
                ]
                if any(codons[child] == infinity for child in children):
                    continue
                step = 0 if (lazy and grammar.n_rules[index] == 1) else 1
                candidate = step + sum(codons[child] for child in children)
                candidate_depth = 1 + (max(depth[child] for child in children) if children else 0)
                if candidate < codons[index] or (
                    candidate == codons[index] and candidate_depth < depth[index]
                ):
                    codons[index] = candidate
                    depth[index] = candidate_depth
                    choice[index] = alternative
                    changed = True

    return codons, depth, choice


def _genome_for(grammar, choice: list, lazy: bool) -> list:
    """Walk the shortest derivation left to right, emitting the codon that picks each rule."""
    genome = []
    frontier = [grammar.start_rule]
    while frontier:
        non_terminal = frontier.pop(0)
        index = grammar.non_terminals.index(non_terminal)
        alternative = choice[index]
        if not (lazy and grammar.n_rules[index] == 1):
            genome.append(alternative)
        children = [
            '<' + name + '>'
            for name in re.findall(r"\<([\(\)\w,-.]+)\>", grammar.production_rules[index][alternative][0])
        ]
        frontier = children + frontier
    return genome


def suggest_settings(grammar_text: str, consumption: str = "eager") -> dict:
    """Work out the settings a grammar needs: a genome that completes, and the depth for it."""
    grammar = _grammar_from_text(grammar_text)
    mode = consumption if consumption in ("eager", "lazy") else "eager"

    codons, depth, choice = _shortest_derivation(grammar, lazy=(mode == "lazy"))
    if codons[0] == float("inf"):
        raise ValueError("This grammar has no terminating derivation.")

    genome = _genome_for(grammar, choice, lazy=(mode == "lazy"))
    # The mapper stops as soon as the genome is exhausted, so a trailing run of
    # single-option rules (which cost nothing under `lazy`) still needs a codon in
    # reserve. GRAPE appends a 50% tail for the same reason.
    genome += [0] * max(len(genome) // 2, 1)
    min_depth = int(depth[0])

    # The mapper counts the root as depth 1 and adds one per expansion, so a
    # derivation of depth D needs max_depth >= D + 1. Confirm against the mapper
    # rather than trusting the arithmetic.
    suggested_depth = min_depth + 1
    result = None
    for _ in range(6):
        for attempt in range(suggested_depth, suggested_depth + 3):
            candidate = map_with_trace(
                grammar_text,
                genome,
                {
                    "consumption": mode,
                    "max_depth": attempt,
                    "genome_representation": "codons",
                    "wrap": False,
                },
            )
            if candidate["status"] == "complete":
                suggested_depth = attempt
                result = candidate
                break
        if result is not None:
            break
        genome.append(0)
    if result is None:  # pragma: no cover - a terminating grammar always completes
        raise ValueError("Could not work out settings for this grammar.")

    eager_codons, _, _ = _shortest_derivation(grammar, lazy=False)
    lazy_codons, _, _ = _shortest_derivation(grammar, lazy=True)

    return {
        "consumption": mode,
        "genome": genome,
        "phenotype": result["phenotype"],
        "min_depth": min_depth,
        "suggested_max_depth": suggested_depth,
        "min_codons": {"eager": int(eager_codons[0]), "lazy": int(lazy_codons[0])},
    }


# --------------------------------------------------------------------------- #
# Is a target string even reachable? (exact, via CFG membership)
# --------------------------------------------------------------------------- #


def _symbols(grammar, production_text: str) -> list:
    """Split a production into terminals (literal text) and non-terminals.

    Whitespace is dropped because the string-match fitness compares phenotypes
    with all whitespace removed, so spacing never affects reachability.
    """
    symbols = []
    position = 0
    for match in re.finditer(r"\<([\(\)\w,-.]+)\>", production_text):
        literal = _WS.sub("", production_text[position : match.start()])
        if literal:
            symbols.append(("t", literal))
        symbols.append(("n", grammar.non_terminals.index(match.group(0))))
        position = match.end()
    tail = _WS.sub("", production_text[position:])
    if tail:
        symbols.append(("t", tail))
    return symbols


def _reachable_alphabet(grammar) -> set:
    """Every character the start rule can eventually put in a phenotype."""
    seen = {0}
    pending = [0]
    characters = set()
    while pending:
        index = pending.pop()
        for production in grammar.production_rules[index]:
            for symbol in _symbols(grammar, production[0]):
                if symbol[0] == "t":
                    characters.update(symbol[1])
                elif symbol[1] not in seen:
                    seen.add(symbol[1])
                    pending.append(symbol[1])
    return characters


def _derivable(grammar, target: str) -> bool:
    """Can the start rule derive exactly `target`? Bottom-up over spans of the target."""
    length = len(target)
    rules = [
        (index, _symbols(grammar, production[0]))
        for index, productions in enumerate(grammar.production_rules)
        for production in productions
    ]
    spans = [set() for _ in grammar.non_terminals]

    changed = True
    while changed:
        changed = False
        for index, symbols in rules:
            for start in range(length + 1):
                positions = {start}
                for kind, value in symbols:
                    reached = set()
                    for at in positions:
                        if kind == "t":
                            if target.startswith(value, at):
                                reached.add(at + len(value))
                        else:
                            reached.update(end for (begin, end) in spans[value] if begin == at)
                    positions = reached
                    if not positions:
                        break
                for end in positions:
                    if (start, end) not in spans[index]:
                        spans[index].add((start, end))
                        changed = True

    return (0, length) in spans[0]


def analyse_target(grammar_text: str, target: str) -> dict:
    """Decide whether any derivation of this grammar produces `target`."""
    grammar = _grammar_from_text(grammar_text)
    cleaned = _WS.sub("", target)
    if not cleaned:
        return {"reachable": None, "missing": [], "length": 0}

    alphabet = _reachable_alphabet(grammar)
    missing = sorted(set(cleaned) - alphabet)
    if missing:
        return {"reachable": False, "missing": missing, "length": len(cleaned)}

    # Membership is polynomial but not free; long targets are not worth blocking on.
    if len(cleaned) > 40:
        return {"reachable": None, "missing": [], "length": len(cleaned)}

    return {"reachable": _derivable(grammar, cleaned), "missing": [], "length": len(cleaned)}


# --------------------------------------------------------------------------- #
# JSON entry points used by the Web Worker
# --------------------------------------------------------------------------- #


def evolve_start_json(config_json: str) -> str:
    global _run_seq
    config = json.loads(config_json)
    _run_seq += 1
    run_id = _run_seq
    _runs[run_id] = evolution_events(config)
    return json.dumps({"run": run_id})


def evolve_next_json(run_id_json: str) -> str:
    run_id = int(json.loads(run_id_json))
    generator = _runs.get(run_id)
    if generator is None:
        return json.dumps(None)
    try:
        return json.dumps(next(generator))
    except StopIteration:
        _runs.pop(run_id, None)
        return json.dumps(None)
