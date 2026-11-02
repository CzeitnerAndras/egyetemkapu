import sys
from unittest.mock import MagicMock

from fastapi import FastAPI

from app.tracing import enable_tracing


def test_tracing_stays_off_without_an_endpoint(monkeypatch):
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", raising=False)
    app = FastAPI()

    enable_tracing(app, "bibliography")

    assert app.user_middleware == []


def test_blank_endpoint_stays_off(monkeypatch):
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "   ")
    app = FastAPI()

    enable_tracing(app, "bibliography")

    assert app.user_middleware == []


def test_configured_endpoint_installs_the_exporter(monkeypatch):
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "  http://otel:4318/v1/traces  ")
    trace_mod = MagicMock()
    exporter_mod = MagicMock()
    instrument_mod = MagicMock()
    resources_mod = MagicMock()
    sdk_trace_mod = MagicMock()
    export_mod = MagicMock()
    modules = {
        "opentelemetry": MagicMock(trace=trace_mod),
        "opentelemetry.exporter": MagicMock(),
        "opentelemetry.exporter.otlp": MagicMock(),
        "opentelemetry.exporter.otlp.proto": MagicMock(),
        "opentelemetry.exporter.otlp.proto.http": MagicMock(),
        "opentelemetry.exporter.otlp.proto.http.trace_exporter": exporter_mod,
        "opentelemetry.instrumentation": MagicMock(),
        "opentelemetry.instrumentation.fastapi": instrument_mod,
        "opentelemetry.sdk": MagicMock(),
        "opentelemetry.sdk.resources": resources_mod,
        "opentelemetry.sdk.trace": sdk_trace_mod,
        "opentelemetry.sdk.trace.export": export_mod,
    }
    app = FastAPI()

    with monkeypatch.context() as patched:
        for name, module in modules.items():
            patched.setitem(sys.modules, name, module)
        enable_tracing(app, "bibliography")

    resources_mod.Resource.create.assert_called_once_with({"service.name": "bibliography"})
    exporter_mod.OTLPSpanExporter.assert_called_once_with(endpoint="http://otel:4318/v1/traces")
    sdk_trace_mod.TracerProvider.assert_called_once()
    export_mod.BatchSpanProcessor.assert_called_once()
    trace_mod.set_tracer_provider.assert_called_once()
    instrument_mod.FastAPIInstrumentor.instrument_app.assert_called_once_with(app)
