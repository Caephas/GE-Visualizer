from fastapi import FastAPI, HTTPException, Request

from backend.engine.mapper import map_with_trace
from backend.schemas import GrammarUpload, MapRequest, MapResponse

app = FastAPI(title="GE Visualizer API")


@app.get("/health-check")
def health_check() -> dict:
    return {"message": "GE Visualization API is running!"}


@app.post("/map", response_model=MapResponse)
def map_genome(request: MapRequest) -> MapResponse:
    try:
        return map_with_trace(request.grammar_text, request.genome, request.params)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Mapping failed: {exc}")


@app.post("/grammar")
def upload_grammar(payload: GrammarUpload, request: Request) -> dict:
    request.app.state.grammar_text = payload.grammar_text
    return {"message": "Grammar uploaded successfully."}


@app.get("/grammar")
def get_grammar(request: Request) -> dict:
    if not hasattr(request.app.state, "grammar_text"):
        raise HTTPException(status_code=404, detail="No grammar uploaded yet.")
    return {"grammar_text": request.app.state.grammar_text}
