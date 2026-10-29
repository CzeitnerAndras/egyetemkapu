"""HTTP entry for the length checker.

Pydantic checks the JSON shape. ``checker.check_text`` does the counting.
The page translates the status codes, so this service stays language-neutral.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.checker import MAX_TEXT_LENGTH, LengthError, LengthReport, check_text
from app.metrics import ToolMetricsMiddleware, metrics
from app.rate_limit import ToolRateLimitMiddleware
from app.tracing import enable_tracing

app = FastAPI(
    title="Egyetemkapu length checker",
    version="1.0.0",
    summary="Word, character, and sentence counts for a thesis draft.",
)

# --- Rate limit and metrics ---
app.add_middleware(ToolRateLimitMiddleware)
app.add_middleware(ToolMetricsMiddleware)


class CheckRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "text": "A szakdolgozat összegzése rövid. Ld. pl. a 3,14. ábrát.",
                    "wordLimit": 250,
                    "characterLimit": 1500,
                }
            ]
        },
    )

    text: str = Field(max_length=MAX_TEXT_LENGTH)
    word_limit: int | None = Field(default=None, alias="wordLimit", ge=1, le=1_000_000)
    character_limit: int | None = Field(default=None, alias="characterLimit", ge=1, le=1_000_000)


class CheckResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    words: int
    characters: int
    characters_no_spaces: int = Field(alias="charactersNoSpaces")
    sentences: int
    paragraphs: int
    longest_sentence_words: int = Field(alias="longestSentenceWords")
    longest_sentence: str = Field(alias="longestSentence")
    reading_seconds: int = Field(alias="readingSeconds")
    reading_wpm: int = Field(alias="readingWpm")
    word_limit: int | None = Field(alias="wordLimit")
    words_over: int = Field(alias="wordsOver")
    word_status: str = Field(alias="wordStatus")
    character_limit: int | None = Field(alias="characterLimit")
    characters_over: int = Field(alias="charactersOver")
    character_status: str = Field(alias="characterStatus")


def _response(report: LengthReport) -> CheckResponse:
    return CheckResponse(
        words=report.words,
        characters=report.characters,
        characters_no_spaces=report.characters_no_spaces,
        sentences=report.sentences,
        paragraphs=report.paragraphs,
        longest_sentence_words=report.longest_sentence_words,
        longest_sentence=report.longest_sentence,
        reading_seconds=report.reading_seconds,
        reading_wpm=report.reading_wpm,
        word_limit=report.word_limit,
        words_over=report.words_over,
        word_status=report.word_status,
        character_limit=report.character_limit,
        characters_over=report.characters_over,
        character_status=report.character_status,
    )


@app.get("/api/thesis/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/thesis/metrics")
def service_metrics() -> dict[str, int | float | str]:
    return metrics.snapshot("thesis")


@app.post("/api/thesis/check", response_model=CheckResponse)
def create_check(body: CheckRequest) -> CheckResponse:
    try:
        report = check_text(body.text, body.word_limit, body.character_limit)
    except LengthError as error:
        raise HTTPException(status_code=400, detail=error.code) from error
    return _response(report)


enable_tracing(app, "thesis")
