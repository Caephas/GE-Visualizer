#!/usr/bin/env python
"""End-to-end smoke test against a running GE Visualizer stack.

Requires the backend to be running, e.g.:
    uvicorn backend.main:app --port 8000

Usage:
    python tools/e2e_smoke.py                          # against 127.0.0.1:8000
    python tools/e2e_smoke.py --base http://localhost:5173/api   # via the Vite proxy
"""

from __future__ import annotations

import argparse
import json
import urllib.request

GRAMMAR = "<start> ::= <char> | <char><start>\n<char> ::= a | b | c"
GENOME = [1, 0, 2, 1]
PARAMS = {"consumption": "eager", "genome_representation": "codons", "max_depth": 40}


def post(base: str, path: str, payload: dict) -> tuple[int, bytes]:
    request = urllib.request.Request(
        f"{base}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request) as response:
        return response.status, response.read()


def main() -> None:
    parser = argparse.ArgumentParser(description="GE Visualizer end-to-end smoke test.")
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    status, body = post(
        args.base,
        "/map",
        {"grammar_text": GRAMMAR, "genome": GENOME, "params": PARAMS},
    )
    mapping = json.loads(body)
    assert status == 200, body
    assert mapping["status"] == "complete", mapping
    assert mapping["phenotype"] == "ab", mapping["phenotype"]
    assert len(mapping["trace"]) == 4, len(mapping["trace"])
    assert mapping["trace"][-1]["complete"] is True
    print(f"PASS /map: {mapping['phenotype']!r} with {len(mapping['trace'])} steps")

    status, _ = post(args.base, "/grammar", {"grammar_text": GRAMMAR})
    assert status == 200
    print("PASS /grammar upload")

    status, body = post(
        args.base,
        "/evolve",
        {
            "grammar_text": GRAMMAR,
            "problem": "string_match",
            "target": "abc",
            "population_size": 40,
            "generations": 5,
            "seed": 7,
        },
    )
    assert status == 200
    events = [line for line in body.decode().splitlines() if line.startswith("data: ")]
    payloads = [json.loads(line[6:]) for line in events]
    assert any(event["type"] == "generation" for event in payloads), payloads
    assert any(event["type"] == "done" for event in payloads), payloads
    print(f"PASS /evolve: {len(payloads)} SSE events")

    print("e2e smoke: all checks passed")


if __name__ == "__main__":
    main()
