from backend.engine.evolution import evolution_events
from backend.schemas import EvolutionConfig

STRING_GRAMMAR = "<start> ::= <char> | <char><start>\n<char> ::= a | b | c"

SR_GRAMMAR = "\n".join(
    [
        "<expr> ::= <term> | <expr> + <term> | <expr> - <term>",
        "<term> ::= <factor> | <term> * <factor> | <term> / <factor>",
        "<factor> ::= ( <expr> ) | x | 1 | 2 | 3",
    ]
)


def _collect(config: EvolutionConfig) -> list[dict]:
    return list(evolution_events(config))


def test_string_match_converges_with_seed() -> None:
    config = EvolutionConfig(
        grammar_text=STRING_GRAMMAR,
        problem="string_match",
        target="abc",
        population_size=80,
        generations=30,
        seed=7,
        early_stop=True,
    )
    events = _collect(config)
    generations = [event for event in events if event["type"] == "generation"]
    done = [event for event in events if event["type"] == "done"][0]

    assert generations, "expected at least one generation event"
    assert done["best_fitness"] == 0.0
    assert done["best"]["phenotype"] == "abc"
    assert generations[-1]["best_fitness"] <= generations[0]["best_fitness"]
    assert len(generations) <= config.generations


def test_generation_events_have_expected_shape() -> None:
    config = EvolutionConfig(
        grammar_text=STRING_GRAMMAR,
        problem="string_match",
        target="abc",
        population_size=20,
        generations=3,
        seed=1,
        early_stop=False,
    )
    events = _collect(config)
    generations = [event for event in events if event["type"] == "generation"]
    assert len(generations) == 3
    first = generations[0]
    assert set(first) == {"type", "gen", "best_fitness", "mean_fitness", "worst_fitness", "valid_count", "best", "top"}
    assert first["gen"] == 1
    assert len(first["top"]) == 20
    assert set(first["best"]) == {"genome", "phenotype", "fitness", "invalid"}


def test_symbolic_regression_emits_events() -> None:
    config = EvolutionConfig(
        grammar_text=SR_GRAMMAR,
        problem="symbolic_regression",
        population_size=30,
        generations=5,
        seed=1,
    )
    events = _collect(config)
    generations = [event for event in events if event["type"] == "generation"]
    assert len(generations) == 5
    for event in generations:
        assert isinstance(event["best_fitness"], float)
        assert event["best_fitness"] >= 0.0
