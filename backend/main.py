from fastapi import FastAPI
from backend.api.routes import router

app = FastAPI(title="GE Visualization Tool")

# Include API Routes
app.include_router(router)

@app.get("/health-check")
def read_root():
    return {"message": "GE Visualization API is running!"}