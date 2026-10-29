from app.metrics import ToolMetrics


def test_server_errors_change_the_rate_and_client_errors_do_not():
    stats = ToolMetrics()
    stats.record(200, 4)
    stats.record(400, 5)
    stats.record(500, 40)

    snapshot = stats.snapshot("bibliography")

    assert snapshot["service"] == "bibliography"
    assert snapshot["requests"] == 3
    assert snapshot["errors"] == 1
    assert snapshot["errorRate"] == 0.333
    assert snapshot["latencyMsP50"] == 5
    assert snapshot["latencyMsP95"] == 40
