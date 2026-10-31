"""HTTP entry for the bibliography sorter.

Pydantic checks the JSON shape. ``sorter.sort_text`` orders the lines.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.metrics import ToolMetricsMiddleware, metrics
from app.rate_limit import ToolRateLimitMiddleware
from app.sorter import MAX_TEXT_LENGTH, SortError, sort_text
from app.tracing import enable_tracing
from opentelemetry import trace

app = FastAPI(
    title="Egyetemkapu bibliography sorter",
    version="1.0.0",
    summary="Sort reference lines in Hungarian alphabetical order.",
)

# --- Rate limit and metrics ---
app.add_middleware(ToolRateLimitMiddleware)
app.add_middleware(ToolMetricsMiddleware)


class SortRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "text": "Szabó, Anna (2020). A város.\nCzakó, Eszter (2021). A kert.\nCsányi, Péter (2019). A híd.",
                }
            ]
        },
    )

    text: str = Field(max_length=MAX_TEXT_LENGTH)


class SortResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    entries: list[str]
    count: int


@app.get("/api/bibliography/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/bibliography/metrics")
def service_metrics() -> dict[str, int | float | str]:
    return metrics.snapshot("bibliography")


@app.post("/api/bibliography/sort", response_model=SortResponse)
def create_sort(body: SortRequest) -> SortResponse:
    with trace.get_tracer("bibliography").start_as_current_span("bibliography.sort") as span:
        span.set_attribute("bibliography.characters", len(body.text))
        try:
            entries = sort_text(body.text)
        except SortError as error:
            raise HTTPException(status_code=400, detail=error.code) from error
        return SortResponse(entries=entries, count=len(entries))


enable_tracing(app, "bibliography")
