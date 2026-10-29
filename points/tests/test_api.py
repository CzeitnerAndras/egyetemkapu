from fastapi.testclient import TestClient

from app.main import app
from app.rate_limit import LIMIT

client = TestClient(app)

SAMPLE = {
    "parts": [
        {"name": "ZH", "maxPoints": 30, "earned": 22},
        {"name": "Beadandó", "maxPoints": 20, "earned": 16},
        {"name": "Vizsga", "maxPoints": 50, "earned": None},
    ],
    "thresholds": [
        {"grade": 2, "minPercent": 50},
        {"grade": 3, "minPercent": 65},
        {"grade": 4, "minPercent": 75},
        {"grade": 5, "minPercent": 85},
    ],
}


def test_health():
    response = client.get("/api/points/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_plan_returns_camel_case_targets():
    response = client.post("/api/points/plan", json=SAMPLE)

    assert response.status_code == 200
    body = response.json()
    assert body["earnedSoFar"] == 38
    assert body["currentGrade"] == 1
    assert body["currentPercent"] == 38
    assert body["openPartNames"] == ["Vizsga"]
    grade_two = body["targets"][0]
    assert grade_two["grade"] == 2
    assert grade_two["status"] == "reachable"
    assert grade_two["pointsNeeded"] == 12
    assert grade_two["pointsRequired"] == 50


def test_missing_thresholds_use_the_defaults():
    response = client.post(
        "/api/points/plan",
        json={"parts": [{"name": "Vizsga", "maxPoints": 100, "earned": 90}]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["currentGrade"] == 5
    assert [item["minPercent"] for item in body["targets"]] == [50, 65, 75, 85]


def test_a_score_past_the_maximum_is_a_client_error():
    response = client.post(
        "/api/points/plan",
        json={
            "parts": [{"name": "ZH", "maxPoints": 10, "earned": 11}],
            "thresholds": SAMPLE["thresholds"],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "earned_above_max"


def test_a_missing_part_list_is_rejected_by_the_schema():
    response = client.post("/api/points/plan", json={"parts": []})

    assert response.status_code == 422


def test_a_burst_from_one_address_is_limited_and_health_stays_open():
    headers = {"X-Forwarded-For": "203.0.113.10"}

    for _ in range(LIMIT):
        response = client.post("/api/points/plan", json=SAMPLE, headers=headers)
        assert response.status_code == 200

    blocked = client.post("/api/points/plan", json=SAMPLE, headers=headers)
    assert blocked.status_code == 429
    assert client.get("/api/points/health", headers=headers).status_code == 200
    assert client.post(
        "/api/points/plan",
        json=SAMPLE,
        headers={"X-Forwarded-For": "203.0.113.11"},
    ).status_code == 200
