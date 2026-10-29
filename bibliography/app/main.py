"""HTTP entry for the bibliography sorter.

Pydantic checks the JSON shape. ``sorter.sort_text`` orders the lines.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.rate_limit import ToolRateLimitMiddleware
from app.sorter import MAX_TEXT_LENGTH, SortError, sort_text

app = FastAPI(
    title="Egyetemkapu bibliography sorter",
    version="1.0.0",
    summary="Sort reference lines in Hungarian alphabetical order.",
)

# --- Rate limit ---
app.add_middleware(ToolRateLimitMiddleware)


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


@app.post("/api/bibliography/sort", response_model=SortResponse)
def create_sort(body: SortRequest) -> SortResponse:
    try:
        entries = sort_text(body.text)
    except SortError as error:
        raise HTTPException(status_code=400, detail=error.code) from error
    return SortResponse(entries=entries, count=len(entries))
