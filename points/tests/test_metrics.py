from app.metrics import ToolMetrics


def test_server_errors_change_the_rate_and_client_errors_do_not():
    stats = ToolMetrics()
    stats.record(200, 4)
    stats.record(400, 5)
    stats.record(500, 40)

    snapshot = stats.snapshot("points")

    assert snapshot["requests"] == 3
    assert snapshot["errors"] == 1
    assert snapshot["errorRate"] == 0.333
    assert snapshot["latencyMsP50"] == 5
    assert snapshot["latencyMsP95"] == 40


def test_an_empty_service_reports_zero():
    snapshot = ToolMetrics().snapshot("points")

    assert snapshot["errorRate"] == 0.0
    assert snapshot["latencyMsP95"] == 0
