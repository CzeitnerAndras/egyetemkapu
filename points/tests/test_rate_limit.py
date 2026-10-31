from starlette.requests import Request

from app.rate_limit import ToolRateLimit, client_ip


def http_request(headers=None, host="198.51.100.8"):
    raw = [
        (key.lower().encode(), value.encode())
        for key, value in (headers or {}).items()
    ]
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/",
        "raw_path": b"/",
        "query_string": b"",
        "headers": raw,
        "client": None if host is None else (host, 1234),
        "server": ("test", 80),
    }
    return Request(scope)


def test_client_ip_uses_the_first_forwarded_hop():
    request = http_request({"X-Forwarded-For": " 203.0.113.9 , 10.0.0.1 "})

    assert client_ip(request) == "203.0.113.9"


def test_client_ip_falls_back_when_the_forwarded_hop_is_blank():
    request = http_request({"X-Forwarded-For": " , 10.0.0.1"})

    assert client_ip(request) == "198.51.100.8"


def test_client_ip_truncates_a_long_hop():
    assert client_ip(http_request({"X-Forwarded-For": "a" * 80})) == "a" * 64


def test_client_ip_without_a_client_is_unknown():
    assert client_ip(http_request(host=None)) == "unknown"


def test_a_new_window_allows_the_same_address_again():
    clock = {"now": 0.0}
    limiter = ToolRateLimit(limit=2, window_seconds=60, now=lambda: clock["now"])

    assert limiter.allow("1.1.1.1")
    assert limiter.allow("1.1.1.1")
    assert not limiter.allow("1.1.1.1")
    assert limiter.allow("2.2.2.2")

    clock["now"] = 60.0
    assert limiter.allow("1.1.1.1")


def test_old_windows_are_dropped_once_the_map_is_large():
    limiter = ToolRateLimit(limit=5, window_seconds=60, now=lambda: 120.0)
    limiter.counts = {str(index): (0, 1) for index in range(5001)}

    assert limiter.allow("new")

    assert list(limiter.counts) == ["new"]
