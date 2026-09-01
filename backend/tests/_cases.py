"""Shared grammar and mapping cases for backend tests and golden fixtures."""

GRAMMARS = {
    "arithmetic": "\n".join(
        [
            "<expr> ::= <term> | <expr> + <term> | <expr> - <term>",
            "<term> ::= <factor> | <term> * <factor> | <term> / <factor>",
            "<factor> ::= ( <expr> ) | <var>",
            "<var> ::= x | y | 1 | 2 | 3",
        ]
    ),
    "single_rule": "\n".join(
        [
            "<start> ::= <s>",
            "<s> ::= <a> <b>",
            "<a> ::= x",
            "<b> ::= y | z",
        ]
    ),
    "recursive": "\n".join(
        [
            "<start> ::= <start> <start> | x",
        ]
    ),
    "wrap_pair": "\n".join(
        [
            "<start> ::= <a> <a>",
            "<a> ::= x | y",
        ]
    ),
}

CASES = [
    {
        "case_id": "arithmetic_eager",
        "grammar": GRAMMARS["arithmetic"],
        "genome": [7, 3, 12, 9, 1, 5, 2],
        "consumption": "eager",
        "max_depth": 40,
    },
    {
        "case_id": "arithmetic_eager_complete",
        "grammar": GRAMMARS["arithmetic"],
        "genome": [153, 127, 92, 357, 399, 124, 41, 294, 153, 268, 253, 175],
        "consumption": "eager",
        "max_depth": 40,
    },
    {
        "case_id": "arithmetic_lazy",
        "grammar": GRAMMARS["arithmetic"],
        "genome": [7, 3, 12, 9, 1, 5, 2],
        "consumption": "lazy",
        "max_depth": 40,
    },
    {
        "case_id": "single_rule_lazy",
        "grammar": GRAMMARS["single_rule"],
        "genome": [1, 2, 3],
        "consumption": "lazy",
        "max_depth": 20,
    },
    {
        "case_id": "recursive_depth_limited",
        "grammar": GRAMMARS["recursive"],
        "genome": [0, 0, 0, 0, 0, 0],
        "consumption": "eager",
        "max_depth": 3,
    },
    {
        "case_id": "genome_exhausted",
        "grammar": GRAMMARS["arithmetic"],
        "genome": [1],
        "consumption": "eager",
        "max_depth": 40,
    },
]
