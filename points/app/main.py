"""HTTP entry for the points planner.

Pydantic checks the JSON shape. ``planner.plan_course`` does the maths.
The page translates the status codes, so this service stays language-neutral.
"""

from decimal import Decimal
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.planner import (
    DEFAULT_THRESHOLDS,
    CoursePlan,
    PartInput,
    PlanError,
    ThresholdInput,
    plan_course,
)

app = FastAPI(
    title="Egyetemkapu points",
    version="1.0.0",
    summary="How many points each grade still needs.",
)


def _decimal(value: Any) -> Decimal:
    """Build a Decimal from the JSON value without going through binary float.

    ``Decimal(0.1)`` is not one tenth. ``Decimal(str(0.1))`` is, and so is
    ``Decimal("0.1")`` when the client sends a string.
    """
    if isinstance(value, Decimal):
        parsed = value
    elif isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ValueError("not_a_number")
    else:
        try:
            parsed = Decimal(str(value))
        except Exception as error:
            raise ValueError("not_a_number") from error
    if not parsed.is_finite():
        raise ValueError("not_a_number")
    return parsed


class PartIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=80)
    max_points: Decimal = Field(alias="maxPoints", gt=0, le=10000)
    earned: Decimal | None = Field(default=None, ge=0, le=10000)

    @field_validator("max_points", "earned", mode="before")
    @classmethod
    def parse_points(cls, value: Any) -> Decimal | None:
        if value is None or value == "":
            return None
        return _decimal(value)


class ThresholdIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    grade: int = Field(ge=2, le=5)
    min_percent: Decimal = Field(alias="minPercent", gt=0, le=100)

    @field_validator("min_percent", mode="before")
    @classmethod
    def parse_percent(cls, value: Any) -> Decimal:
        return _decimal(value)


def _default_thresholds() -> list[ThresholdIn]:
    return [
        ThresholdIn(grade=item.grade, min_percent=item.min_percent)
        for item in DEFAULT_THRESHOLDS
    ]


class PlanRequest(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
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
            ]
        },
    )

    parts: list[PartIn] = Field(min_length=1, max_length=12)
    thresholds: list[ThresholdIn] = Field(default_factory=_default_thresholds, min_length=1, max_length=4)


class GradeTargetOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    grade: int
    min_percent: float = Field(alias="minPercent")
    points_required: float = Field(alias="pointsRequired")
    points_needed: float = Field(alias="pointsNeeded")
    status: Literal["already", "reachable", "impossible"]


class PlanResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    max_total: float = Field(alias="maxTotal")
    earned_so_far: float = Field(alias="earnedSoFar")
    remaining_max: float = Field(alias="remainingMax")
    current_percent: float = Field(alias="currentPercent")
    current_grade: int = Field(alias="currentGrade")
    open_part_names: list[str] = Field(alias="openPartNames")
    targets: list[GradeTargetOut]


def _number(value: Decimal) -> float:
    return float(value)


def _response(plan: CoursePlan) -> PlanResponse:
    return PlanResponse(
        max_total=_number(plan.max_total),
        earned_so_far=_number(plan.earned_so_far),
        remaining_max=_number(plan.remaining_max),
        current_percent=_number(plan.current_percent),
        current_grade=plan.current_grade,
        open_part_names=list(plan.open_part_names),
        targets=[
            GradeTargetOut(
                grade=target.grade,
                min_percent=_number(target.min_percent),
                points_required=_number(target.points_required),
                points_needed=_number(target.points_needed),
                status=target.status,
            )
            for target in plan.targets
        ],
    )


@app.get("/api/points/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/points/plan", response_model=PlanResponse)
def create_plan(body: PlanRequest) -> PlanResponse:
    try:
        plan = plan_course(
            [PartInput(part.name, part.max_points, part.earned) for part in body.parts],
            [ThresholdInput(item.grade, item.min_percent) for item in body.thresholds],
        )
    except PlanError as error:
        raise HTTPException(status_code=400, detail=error.code) from error
    return _response(plan)
