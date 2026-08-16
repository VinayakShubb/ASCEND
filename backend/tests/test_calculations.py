from datetime import date, timedelta

import pytest

from services import calculations


def make_habit(id="h1", difficulty="medium", archived=False):
    return {
        "id": id,
        "name": "Test Habit",
        "category": "General",
        "difficulty": difficulty,
        "frequency": "daily",
        "created_at": "2026-01-01T00:00:00Z",
        "archived": archived,
    }


def make_log(habit_id="h1", date_str="2026-08-16", status="completed"):
    return {
        "id": f"log-{habit_id}-{date_str}-{status}",
        "habit_id": habit_id,
        "date": date_str,
        "status": status,
        "timestamp": f"{date_str}T00:00:00Z",
    }


class TestDailyCompletion:
    def test_no_habits_returns_zero(self):
        assert calculations.calculate_daily_completion([], [], "2026-08-16") == 0

    def test_all_habits_archived_returns_zero(self):
        habits = [make_habit(archived=True)]
        assert calculations.calculate_daily_completion(habits, [], "2026-08-16") == 0

    def test_half_completed(self):
        habits = [make_habit(id="h1"), make_habit(id="h2")]
        logs = [make_log(habit_id="h1", date_str="2026-08-16")]
        assert calculations.calculate_daily_completion(habits, logs, "2026-08-16") == 50.0

    def test_archived_habit_excluded_from_denominator(self):
        habits = [make_habit(id="h1"), make_habit(id="h2", archived=True)]
        logs = [make_log(habit_id="h1", date_str="2026-08-16")]
        assert calculations.calculate_daily_completion(habits, logs, "2026-08-16") == 100.0

    def test_log_for_archived_habit_not_counted(self):
        habits = [make_habit(id="h1"), make_habit(id="h2", archived=True)]
        logs = [make_log(habit_id="h2", date_str="2026-08-16")]
        assert calculations.calculate_daily_completion(habits, logs, "2026-08-16") == 0.0

    def test_only_matching_date_counts(self):
        habits = [make_habit(id="h1")]
        logs = [make_log(habit_id="h1", date_str="2026-08-15")]
        assert calculations.calculate_daily_completion(habits, logs, "2026-08-16") == 0.0

    def test_only_completed_status_counts(self):
        habits = [make_habit(id="h1")]
        logs = [make_log(habit_id="h1", date_str="2026-08-16", status="skipped")]
        assert calculations.calculate_daily_completion(habits, logs, "2026-08-16") == 0.0


class TestWeightedScore:
    def test_no_habits_returns_zero(self):
        assert calculations.calculate_weighted_score([], [], "2026-08-16") == 0

    def test_hard_habit_worth_more_than_easy(self):
        habits = [make_habit(id="easy", difficulty="easy"), make_habit(id="hard", difficulty="hard")]
        logs = [make_log(habit_id="hard", date_str="2026-08-16")]
        # potential = 1.0 + 1.5 = 2.5, earned = 1.5 -> 60%
        assert calculations.calculate_weighted_score(habits, logs, "2026-08-16") == pytest.approx(60.0)

    def test_extreme_difficulty_multiplier(self):
        habits = [make_habit(id="h1", difficulty="extreme")]
        logs = [make_log(habit_id="h1", date_str="2026-08-16")]
        assert calculations.calculate_weighted_score(habits, logs, "2026-08-16") == 100.0

    def test_unknown_difficulty_defaults_to_multiplier_one(self):
        habits = [make_habit(id="h1", difficulty="weird")]
        logs = [make_log(habit_id="h1", date_str="2026-08-16")]
        assert calculations.calculate_weighted_score(habits, logs, "2026-08-16") == 100.0

    def test_nothing_completed_is_zero(self):
        habits = [make_habit(id="h1", difficulty="hard")]
        assert calculations.calculate_weighted_score(habits, [], "2026-08-16") == 0.0


class TestDisciplineIndex:
    def test_perfect_week_is_100(self):
        habits = [make_habit(id="h1")]
        end = date(2026, 8, 16)
        logs = [make_log(habit_id="h1", date_str=(end - timedelta(days=i)).isoformat()) for i in range(7)]
        assert calculations.calculate_discipline_index(habits, logs, end.isoformat()) == 100

    def test_no_logs_is_zero(self):
        habits = [make_habit(id="h1")]
        assert calculations.calculate_discipline_index(habits, [], "2026-08-16") == 0

    def test_only_averages_the_trailing_seven_days(self):
        habits = [make_habit(id="h1")]
        end = date(2026, 8, 16)
        # 3 completions, but 10 days ago -- outside the 7-day window.
        logs = [make_log(habit_id="h1", date_str=(end - timedelta(days=10)).isoformat())]
        assert calculations.calculate_discipline_index(habits, logs, end.isoformat()) == 0

    def test_defaults_to_today_when_no_end_date_given(self):
        habits = [make_habit(id="h1")]
        today = date.today().isoformat()
        logs = [make_log(habit_id="h1", date_str=today)]
        assert calculations.calculate_discipline_index(habits, logs) == calculations.calculate_discipline_index(
            habits, logs, today
        )


class TestStreak:
    def test_no_logs_no_streak(self):
        assert calculations.get_streak("h1", [], "2026-08-16") == 0

    def test_today_only(self):
        logs = [make_log(date_str="2026-08-16")]
        assert calculations.get_streak("h1", logs, "2026-08-16") == 1

    def test_consecutive_days_including_today(self):
        end = date(2026, 8, 16)
        logs = [make_log(date_str=(end - timedelta(days=i)).isoformat()) for i in range(5)]
        assert calculations.get_streak("h1", logs, end.isoformat()) == 5

    def test_streak_alive_when_today_not_done_but_yesterday_was(self):
        end = date(2026, 8, 16)
        yesterday = end - timedelta(days=1)
        logs = [make_log(date_str=yesterday.isoformat())]
        assert calculations.get_streak("h1", logs, end.isoformat()) == 1

    def test_streak_broken_by_gap(self):
        end = date(2026, 8, 16)
        logs = [
            make_log(date_str=end.isoformat()),
            make_log(date_str=(end - timedelta(days=1)).isoformat()),
            # gap at day 2 -- streak should stop counting here
            make_log(date_str=(end - timedelta(days=3)).isoformat()),
        ]
        assert calculations.get_streak("h1", logs, end.isoformat()) == 2

    def test_zero_when_today_and_yesterday_both_missed(self):
        end = date(2026, 8, 16)
        logs = [make_log(date_str=(end - timedelta(days=2)).isoformat())]
        assert calculations.get_streak("h1", logs, end.isoformat()) == 0

    def test_only_counts_completed_status(self):
        logs = [make_log(date_str="2026-08-16", status="skipped")]
        assert calculations.get_streak("h1", logs, "2026-08-16") == 0

    def test_ignores_other_habits_logs(self):
        logs = [make_log(habit_id="other-habit", date_str="2026-08-16")]
        assert calculations.get_streak("h1", logs, "2026-08-16") == 0
