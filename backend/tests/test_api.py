from fastapi.testclient import TestClient

from backend.main import app
from backend.tests._cases import GRAMMARS


def _map_payload(grammar: str, genome: list[int], **overrides: object) -> dict:
    params: dict[str, object] = {
        "consumption": "eager",
        "genome_representation": "codons",
        "max_depth": 40,
        "codon_size": 400,
        "bits_per_codon": 8,
        "wrap": False,
    }
    params.update(overrides)
    return {"grammar_text": grammar, "genome": genome, "params": params}


def test_health_check() -> None:
    client = TestClient(app)
    response = client.get("/health-check")
    assert response.status_code == 200
    assert response.json() == {"message": "GE Visualization API is running!"}


def test_map_endpoint_returns_trace() -> None:
    client = TestClient(app)
    response = client.post(
        "/map",
        json=_map_payload(GRAMMARS["arithmetic"], [153, 127, 92, 357, 399, 124, 41, 294, 153, 268, 253, 175]),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "complete"
    assert body["phenotype"]
    assert body["trace"]
    assert body["trace"][0]["step"] == 0
    assert set(body["summary"]) == {"used_codons", "nodes", "depth", "n_wraps"}


def test_map_endpoint_rejects_non_binary_bits() -> None:
    client = TestClient(app)
    response = client.post(
        "/map",
        json=_map_payload(GRAMMARS["arithmetic"], [0, 2], genome_representation="binary"),
    )
    assert response.status_code == 400


def test_map_endpoint_rejects_malformed_grammar() -> None:
    client = TestClient(app)
    response = client.post("/map", json=_map_payload("this is not a bnf grammar", [1, 2]))
    assert response.status_code == 400


def test_grammar_store_roundtrip() -> None:
    client = TestClient(app)
    assert client.get("/grammar").status_code == 404
    response = client.post("/grammar", json={"grammar_text": GRAMMARS["arithmetic"]})
    assert response.status_code == 200
    response = client.get("/grammar")
    assert response.status_code == 200
    assert response.json()["grammar_text"] == GRAMMARS["arithmetic"]


def test_evolve_streams_generation_events() -> None:
    client = TestClient(app)
    response = client.post(
        "/evolve",
        json={
            "grammar_text": "<start> ::= <char><char>\n<char> ::= a | b | c",
            "problem": "string_match",
            "target": "ab",
            "population_size": 20,
            "generations": 3,
            "seed": 1,
        },
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert 'data: {"type": "generation"' in response.text
    assert 'data: {"type": "done"' in response.text


def test_evolve_reports_grammar_errors_in_stream() -> None:
    client = TestClient(app)
    response = client.post(
        "/evolve",
        json={
            "grammar_text": "this is not bnf",
            "problem": "string_match",
            "population_size": 10,
            "generations": 1,
        },
    )
    assert response.status_code == 200
    assert '"type": "error"' in response.text
