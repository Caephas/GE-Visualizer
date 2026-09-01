from fastapi.testclient import TestClient

from backend.main import app


def test_health_check() -> None:
    client = TestClient(app)
    response = client.get("/health-check")
    assert response.status_code == 200
    assert response.json() == {"message": "GE Visualization API is running!"}
