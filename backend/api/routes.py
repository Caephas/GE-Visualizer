from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.requests import Request
import os
from .ge_engine import GEEngine

router = APIRouter()
GRAMMAR_FILE_PATH = "backend/api/grape/grammar.bnf" 

# Define the default parameters
DEFAULT_GE_PARAMS = {
    "population_size": 1000,
    "max_generations": 100,
    "p_crossover": 0.8,
    "p_mutation": 0.1,
    "elite_size": 1,
    "hall_of_fame_size": 1,
    "codon_size": 400,
    "max_tree_depth": 50,
    "tournament_size": 7,
    "min_init_depth": 9,
    "max_init_depth": 20,
    "codon_consumption": "lazy",
    "genome_representation": "list",
}

class GEParams(BaseModel):
    population_size: int
    max_generations: int
    p_crossover: float
    p_mutation: float
    elite_size: int
    hall_of_fame_size: int
    codon_size: int
    max_tree_depth: int
    tournament_size: int
    min_init_depth: int
    max_init_depth: int
    codon_consumption: str
    genome_representation: str

class GrammarInput(BaseModel):
    grammar_text: str

class GenomeInput(BaseModel):
    genome: list

def get_ge_engine(request: Request) -> GEEngine:
    """Dependency to get the stored GE Engine from FastAPI app state."""
    if not hasattr(request.app.state, "ge_engine"):
        raise HTTPException(status_code=404, detail="No grammar uploaded yet.")
    return request.app.state.ge_engine

@router.post("/upload-grammar")
def upload_grammar(grammar_input: GrammarInput, request: Request):
    """Uploads and saves BNF grammar to a file, then initializes the GE engine."""
    try:
        # ✅ Save grammar text to a file
        os.makedirs(os.path.dirname(GRAMMAR_FILE_PATH), exist_ok=True)  # Ensure directory exists
        with open(GRAMMAR_FILE_PATH, "w") as f:
            f.write(grammar_input.grammar_text)

        # ✅ Load grammar into GEEngine
        request.app.state.ge_engine = GEEngine(GRAMMAR_FILE_PATH)
        return {"message": "Grammar uploaded and loaded successfully!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/get-grammar")
def get_grammar(request: Request):
    """ Retrieves the parsed BNF grammar """
    if not hasattr(request.app.state, "ge_engine"):
        raise HTTPException(status_code=404, detail="No grammar uploaded yet.")
    return request.app.state.ge_engine.grammar  # Get stored grammar from GEEngine

@router.post("/set-parameters")
def set_ge_parameters(params: GEParams, request: Request):
    """Allows users to configure GE parameters dynamically."""
    request.app.state.ge_params = params.dict()  # Store parameters
    return {"message": "GE parameters updated successfully!", "params": request.app.state.ge_params}

@router.post("/generate-phenotype")
def generate_phenotype(genome_input: GenomeInput, request: Request):
    """Uses GRAPE to convert a genome into a phenotype."""
    if not hasattr(request.app.state, "ge_params"):
        request.app.state.ge_params = DEFAULT_GE_PARAMS  # Use defaults if not set

    ge_engine = GEEngine(GRAMMAR_FILE_PATH, request.app.state.ge_params)  # Pass user params
    
    try:
        phenotype = ge_engine.map_genotype_to_phenotype(genome_input.genome)
        return {"genome": genome_input.genome, "phenotype": phenotype}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))