from backend.schemas import DerivationNode, GEParams, MapResponse, TraceStep


def test_ge_params_defaults() -> None:
    params = GEParams(consumption="eager", genome_representation="codons")
    assert params.codon_size == 400
    assert params.bits_per_codon == 8
    assert params.wrap is False


def test_map_response_roundtrip() -> None:
    step = TraceStep(
        step=0,
        non_terminal="<expr>",
        codon_index=0,
        codon_value=42,
        rule_count=3,
        choice=0,
        expansion="<term>",
        partial_phenotype="<term>",
        depth=1,
        wraps=0,
        consumed=True,
        complete=False,
    )
    response = MapResponse(
        genome=[42],
        params=GEParams(consumption="eager", genome_representation="codons"),
        trace=[step],
        phenotype="<term>",
        status="complete",
        summary={"used_codons": 1},
    )
    assert response.status == "complete"
    assert response.trace[0].choice == 0


def test_derivation_node_children() -> None:
    leaf = DerivationNode(id="n1", label="x", kind="terminal")
    root = DerivationNode(id="n0", label="<expr>", kind="root", children=[leaf])
    assert root.children[0].label == "x"
