from fastapi import FastAPI

app = FastAPI(title="GE Visualizer API")


@app.get("/health-check")
def health_check() -> dict:
    return {"message": "GE Visualization API is running!"}
