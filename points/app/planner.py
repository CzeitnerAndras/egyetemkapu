"""Grade targets for a course that is still in progress.

A course is a list of parts (a midterm, an assignment, an exam). Each part
has a maximum. A number in ``earned`` is a score already marked, including
zero. ``None`` means that part has not been marked yet.

Thresholds are the minimum percent of the course total for grades 2–5.
``plan_course`` reports the current standing and, for each grade, whether
the points still available on the unmarked parts are enough.
"""

from collections.abc import Sequence
from decimal import Decimal, ROUND_CEILING, ROUND_HALF_UP
from typing import Literal

HUNDREDTH = Decimal("0.01")
TargetStatus = Literal["already", "reachable", "impossible"]


class PlanError(Exception):
    """A course the planner refuses to score. ``code`` is for the API client."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


class PartInput:
    def __init__(self, name: str, max_points: Decimal, earned: Decimal | None) -> None:
        self.name = name
        self.max_points = max_points
        self.earned = earned


class ThresholdInput:
    def __init__(self, grade: int, min_percent: Decimal) -> None:
        self.grade = grade
        self.min_percent = min_percent


class GradeTarget:
    def __init__(
        self,
        grade: int,
        min_percent: Decimal,
        points_required: Decimal,
        points_needed: Decimal,
        status: TargetStatus,
    ) -> None:
        self.grade = grade
        self.min_percent = min_percent
        self.points_required = points_required
        self.points_needed = points_needed
        self.status = status


class CoursePlan:
    def __init__(
        self,
        max_total: Decimal,
        earned_so_far: Decimal,
        remaining_max: Decimal,
        current_percent: Decimal,
        current_grade: int,
        open_part_names: tuple[str, ...],
        targets: tuple[GradeTarget, ...],
    ) -> None:
        self.max_total = max_total
        self.earned_so_far = earned_so_far
        self.remaining_max = remaining_max
        self.current_percent = current_percent
        self.current_grade = current_grade
        self.open_part_names = open_part_names
        self.targets = targets


DEFAULT_THRESHOLDS = (
    ThresholdInput(2, Decimal("50")),
    ThresholdInput(3, Decimal("65")),
    ThresholdInput(4, Decimal("75")),
    ThresholdInput(5, Decimal("85")),
)


def required_points(max_total: Decimal, min_percent: Decimal) -> Decimal:
    """Smallest hundredth of a point that still reaches ``min_percent``.

    Ceiling is the safe direction. 33.33% of 10 is 3.333, and rounding that
    down to 3.33 would call a short score a pass. 50% of 100 stays 50.00,
    because an exact hundredth does not move.
    """
    raw = (min_percent / Decimal(100)) * max_total
    return raw.quantize(HUNDREDTH, rounding=ROUND_CEILING)


def plan_course(parts: Sequence[PartInput], thresholds: Sequence[ThresholdInput]) -> CoursePlan:
    cleaned_parts = _clean_parts(parts)
    ordered_thresholds = _clean_thresholds(thresholds)

    earned_so_far = sum(
        (part.earned for part in cleaned_parts if part.earned is not None),
        start=Decimal("0"),
    )
    remaining_max = sum(
        (part.max_points for part in cleaned_parts if part.earned is None),
        start=Decimal("0"),
    )
    max_total = sum((part.max_points for part in cleaned_parts), start=Decimal("0"))
    current_percent = ((earned_so_far / max_total) * Decimal(100)).quantize(
        HUNDREDTH,
        rounding=ROUND_HALF_UP,
    )

    targets: list[GradeTarget] = []
    current_grade = 1
    for threshold in ordered_thresholds:
        points_required = required_points(max_total, threshold.min_percent)
        still_needed = points_required - earned_so_far
        if still_needed <= 0:
            status: TargetStatus = "already"
            still_needed = Decimal("0.00")
            current_grade = threshold.grade
        elif still_needed > remaining_max:
            status = "impossible"
        else:
            status = "reachable"
        targets.append(
            GradeTarget(
                grade=threshold.grade,
                min_percent=threshold.min_percent,
                points_required=points_required,
                points_needed=still_needed,
                status=status,
            )
        )

    open_part_names = tuple(part.name for part in cleaned_parts if part.earned is None)
    return CoursePlan(
        max_total=max_total,
        earned_so_far=earned_so_far,
        remaining_max=remaining_max,
        current_percent=current_percent,
        current_grade=current_grade,
        open_part_names=open_part_names,
        targets=tuple(targets),
    )


def _hundredths(value: Decimal) -> Decimal:
    """Keep scores at two decimal places, and reject anything finer."""
    if value.quantize(HUNDREDTH) != value:
        raise PlanError("too_many_decimals")
    return value


def _clean_parts(parts: Sequence[PartInput]) -> tuple[PartInput, ...]:
    if not parts:
        raise PlanError("empty_parts")

    cleaned: list[PartInput] = []
    for part in parts:
        name = part.name.strip()
        if not name:
            raise PlanError("empty_name")
        max_points = _hundredths(part.max_points)
        if max_points <= 0:
            raise PlanError("max_not_positive")
        earned = None if part.earned is None else _hundredths(part.earned)
        if earned is not None and earned > max_points:
            raise PlanError("earned_above_max")
        if earned is not None and earned < 0:
            raise PlanError("earned_negative")
        cleaned.append(PartInput(name, max_points, earned))
    return tuple(cleaned)


def _clean_thresholds(thresholds: Sequence[ThresholdInput]) -> tuple[ThresholdInput, ...]:
    if not thresholds:
        raise PlanError("no_thresholds")

    ordered = tuple(sorted(thresholds, key=lambda item: item.grade))
    grades = [item.grade for item in ordered]
    if len(grades) != len(set(grades)):
        raise PlanError("duplicate_grade")

    cleaned: list[ThresholdInput] = []
    for item in ordered:
        percent = _hundredths(item.min_percent)
        if percent <= 0 or percent > 100:
            raise PlanError("percent_out_of_range")
        cleaned.append(ThresholdInput(item.grade, percent))

    for earlier, later in zip(cleaned, cleaned[1:]):
        if later.min_percent <= earlier.min_percent:
            raise PlanError("threshold_order")
    return tuple(cleaned)
