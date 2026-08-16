import pytest

from services.user_data import is_valid_habit_name


def test_normal_name_is_valid():
    assert is_valid_habit_name("Gym") is True


@pytest.mark.parametrize("blank", ["", "   ", None])
def test_blank_or_missing_name_is_invalid(blank):
    assert is_valid_habit_name(blank) is False


@pytest.mark.parametrize("junk", ["nan", "NaN", "non", "NoN", "null", "undefined", "UNDEFINED"])
def test_known_junk_values_are_invalid(junk):
    assert is_valid_habit_name(junk) is False


def test_leading_trailing_whitespace_is_trimmed_before_checking():
    assert is_valid_habit_name("   Gym   ") is True
    assert is_valid_habit_name("   nan   ") is False
