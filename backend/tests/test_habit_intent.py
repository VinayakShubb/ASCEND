from services import habit_intent


def test_gym_maps_to_physical_training():
    assert "physical training" in habit_intent.infer_habit_intent("Gym session")


def test_nofap_maps_to_impulse_control():
    assert "impulse-control" in habit_intent.infer_habit_intent("NoFap")


def test_study_maps_to_academic():
    assert "academic" in habit_intent.infer_habit_intent("Study DSA")


def test_coding_maps_to_skill_building():
    assert "skill-building" in habit_intent.infer_habit_intent("LeetCode grind")


def test_unmatched_name_falls_back_to_health_category():
    result = habit_intent.infer_habit_intent("Random Thing", category="Health")
    assert "health discipline" in result


def test_unmatched_name_no_category_uses_generic_default():
    result = habit_intent.infer_habit_intent("Xyz123", category=None)
    assert result == "daily consistency protocol; complete it fully and on time"


def test_matching_is_case_and_punctuation_insensitive():
    assert habit_intent.infer_habit_intent("GYM!!!") == habit_intent.infer_habit_intent("gym")


def test_underscore_and_hyphen_names_still_match():
    assert "physical training" in habit_intent.infer_habit_intent("morning_gym-session")


def test_first_matching_rule_wins():
    # "study" (academic) appears before "code" (skill-building) in the rule
    # list, so a name containing both should resolve to the academic meaning.
    result = habit_intent.infer_habit_intent("study coding")
    assert "academic" in result


def test_build_context_empty_list():
    assert habit_intent.build_habit_intent_context([]) == "- No active protocols."


def test_build_context_lists_every_habit_on_its_own_line():
    habits = [{"name": "Gym", "category": "Health"}, {"name": "Read", "category": "Learning"}]
    context = habit_intent.build_habit_intent_context(habits)
    lines = context.split("\n")
    assert len(lines) == 2
    assert lines[0].startswith("- Gym:")
    assert lines[1].startswith("- Read:")
