from decimal import Decimal

import pytest

from app.planner import (
    DEFAULT_THRESHOLDS,
    PartInput,
    PlanError,
    ThresholdInput,
    plan_course,
    required_points,
)


def test_exact_half_and_exact_pass_mark_do_not_move():
    assert required_points(Decimal("100"), Decimal("50")) == Decimal("50.00")
    assert required_points(Decimal("70"), Decimal("63")) == Decimal("44.10")


def test_a_short_fraction_rounds_up_so_the_percent_is_really_met():
    assert required_points(Decimal("10"), Decimal("33.33")) == Decimal("3.34")


def test_sample_course_says_what_the_exam_still_needs():
    plan = plan_course(
        [
            PartInput("ZH", Decimal("30"), Decimal("22")),
            PartInput("Beadandó", Decimal("20"), Decimal("16")),
            PartInput("Vizsga", Decimal("50"), None),
        ],
        DEFAULT_THRESHOLDS,
    )

    assert plan.max_total == Decimal("100")
    assert plan.earned_so_far == Decimal("38")
    assert plan.remaining_max == Decimal("50")
    assert plan.current_percent == Decimal("38.00")
    assert plan.current_grade == 1
    assert plan.open_part_names == ("Vizsga",)

    by_grade = {target.grade: target for target in plan.targets}
    assert by_grade[2].status == "reachable"
    assert by_grade[2].points_needed == Decimal("12.00")
    assert by_grade[2].points_required == Decimal("50.00")
    assert by_grade[5].status == "reachable"
    assert by_grade[5].points_needed == Decimal("47.00")


def test_zero_is_a_marked_score_and_blocks_every_grade():
    plan = plan_course(
        [PartInput("Vizsga", Decimal("100"), Decimal("0"))],
        DEFAULT_THRESHOLDS,
    )

    assert plan.open_part_names == ()
    assert plan.current_grade == 1
    assert all(target.status == "impossible" for target in plan.targets)


def test_ninety_points_already_holds_every_default_grade():
    plan = plan_course(
        [PartInput("Vizsga", Decimal("100"), Decimal("90"))],
        DEFAULT_THRESHOLDS,
    )

    assert plan.current_grade == 5
    assert all(target.status == "already" for target in plan.targets)
    assert all(target.points_needed == Decimal("0.00") for target in plan.targets)


def test_two_unmarked_parts_share_one_points_budget():
    plan = plan_course(
        [
            PartInput("ZH", Decimal("40"), None),
            PartInput("Vizsga", Decimal("60"), None),
        ],
        DEFAULT_THRESHOLDS,
    )

    assert plan.open_part_names == ("ZH", "Vizsga")
    assert plan.earned_so_far == Decimal("0")
    assert plan.targets[0].status == "reachable"
    assert plan.targets[0].points_needed == Decimal("50.00")


def test_one_point_out_of_three_is_not_yet_a_pass():
    plan = plan_course(
        [PartInput("ZH", Decimal("3"), Decimal("1"))],
        DEFAULT_THRESHOLDS,
    )

    assert plan.current_percent == Decimal("33.33")
    assert plan.current_grade == 1
    assert plan.targets[0].points_required == Decimal("1.50")
    assert plan.targets[0].status == "impossible"
    assert plan.targets[0].points_needed == Decimal("0.50")


def test_earned_points_cannot_pass_the_maximum():
    with pytest.raises(PlanError) as error:
        plan_course(
            [PartInput("ZH", Decimal("10"), Decimal("11"))],
            DEFAULT_THRESHOLDS,
        )
    assert error.value.code == "earned_above_max"


def test_more_than_two_decimal_places_is_rejected():
    with pytest.raises(PlanError) as error:
        plan_course(
            [PartInput("ZH", Decimal("10"), Decimal("1.234"))],
            DEFAULT_THRESHOLDS,
        )
    assert error.value.code == "too_many_decimals"


def test_a_blank_name_is_rejected():
    with pytest.raises(PlanError) as error:
        plan_course(
            [PartInput("   ", Decimal("10"), None)],
            DEFAULT_THRESHOLDS,
        )
    assert error.value.code == "empty_name"


def test_thresholds_must_rise_with_the_grade():
    with pytest.raises(PlanError) as error:
        plan_course(
            [PartInput("ZH", Decimal("100"), None)],
            [
                ThresholdInput(2, Decimal("80")),
                ThresholdInput(3, Decimal("70")),
                ThresholdInput(4, Decimal("90")),
                ThresholdInput(5, Decimal("95")),
            ],
        )
    assert error.value.code == "threshold_order"


def test_a_grade_cannot_be_listed_twice():
    with pytest.raises(PlanError) as error:
        plan_course(
            [PartInput("ZH", Decimal("100"), None)],
            [
                ThresholdInput(2, Decimal("50")),
                ThresholdInput(2, Decimal("60")),
            ],
        )
    assert error.value.code == "duplicate_grade"
