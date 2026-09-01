import json

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse

from backend.engine import evolution as evolution_engine
from backend.engine.mapper import map_with_trace
from backend.schemas import EvolutionConfig, GrammarUpload, MapRequest, MapResponse

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


@app.post("/evolve")
def evolve(config: EvolutionConfig) -> StreamingResponse:
    """Run a GRAPE/DEAP evolution, streaming per-generation stats as SSE events."""

    def event_stream():
        try:
            for event in evolution_engine.evolution_events(config):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
