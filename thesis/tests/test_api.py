from fastapi.testclient import TestClient

from app.main import app
from app.rate_limit import LIMIT

client = TestClient(app)


def test_health():
    response = client.get("/api/thesis/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_check_returns_camel_case_counts():
    response = client.post(
        "/api/thesis/check",
        json={
            "text": "A szakdolgozat összegzése rövid.",
            "wordLimit": 250,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["words"] == 4
    assert body["sentences"] == 1
    assert body["wordStatus"] == "within"
    assert body["wordsOver"] == 0
    assert body["wordLimit"] == 250
    assert body["characterStatus"] == "unset"
    assert body["characterLimit"] is None
    assert body["readingWpm"] == 200
    assert "összegzése" in body["longestSentence"]


def test_missing_limits_stay_unset():
    response = client.post("/api/thesis/check", json={"text": "Egy mondat."})

    assert response.status_code == 200
    body = response.json()
    assert body["wordStatus"] == "unset"
    assert body["characterStatus"] == "unset"


def test_blank_text_is_a_client_error():
    response = client.post("/api/thesis/check", json={"text": "  "})

    assert response.status_code == 400
    assert response.json()["detail"] == "empty_text"


def test_a_zero_limit_is_rejected_by_the_schema():
    response = client.post(
        "/api/thesis/check",
        json={"text": "Egy mondat.", "wordLimit": 0},
    )

    assert response.status_code == 422


def test_a_burst_from_one_address_is_limited_and_health_stays_open():
    headers = {"X-Forwarded-For": "203.0.113.20"}
    body = {"text": "Egy mondat."}

    for _ in range(LIMIT):
        response = client.post("/api/thesis/check", json=body, headers=headers)
        assert response.status_code == 200

    blocked = client.post("/api/thesis/check", json=body, headers=headers)
    assert blocked.status_code == 429
    assert blocked.json()["detail"] == "too_many_requests"
    assert client.get("/api/thesis/health", headers=headers).status_code == 200
    assert client.post(
        "/api/thesis/check",
        json=body,
        headers={"X-Forwarded-For": "203.0.113.21"},
    ).status_code == 200


def test_metrics_skip_health_and_count_a_check():
    before = client.get("/api/thesis/metrics").json()["requests"]

    assert client.get("/api/thesis/health").status_code == 200
    assert client.post("/api/thesis/check", json={"text": "Egy mondat."}).status_code == 200

    body = client.get("/api/thesis/metrics").json()
    assert body["service"] == "thesis"
    assert body["requests"] == before + 1
    assert "latencyMsP95" in body
