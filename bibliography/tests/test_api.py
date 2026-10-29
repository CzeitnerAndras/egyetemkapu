from fastapi.testclient import TestClient

from app.main import app
from app.rate_limit import LIMIT

client = TestClient(app)

SAMPLE = "\n".join([
    "Szabó, Anna (2020). A város.",
    "Czakó, Eszter (2021). A kert.",
    "Csányi, Péter (2019). A híd.",
])


def test_health():
    response = client.get("/api/bibliography/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_sort_returns_hungarian_order():
    response = client.post("/api/bibliography/sort", json={"text": SAMPLE})

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 3
    assert body["entries"] == [
        "Czakó, Eszter (2021). A kert.",
        "Csányi, Péter (2019). A híd.",
        "Szabó, Anna (2020). A város.",
    ]


def test_blank_text_is_a_client_error():
    response = client.post("/api/bibliography/sort", json={"text": "\n  \n"})

    assert response.status_code == 400
    assert response.json()["detail"] == "empty_text"


def test_a_burst_from_one_address_is_limited_and_health_stays_open():
    headers = {"X-Forwarded-For": "203.0.113.30"}

    for _ in range(LIMIT):
        response = client.post("/api/bibliography/sort", json={"text": SAMPLE}, headers=headers)
        assert response.status_code == 200

    blocked = client.post("/api/bibliography/sort", json={"text": SAMPLE}, headers=headers)
    assert blocked.status_code == 429
    assert client.get("/api/bibliography/health", headers=headers).status_code == 200
