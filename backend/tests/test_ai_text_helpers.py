from services import ai_brief, ai_coach


class TestNormalizeQuote:
    def test_strips_quotes_when_they_sit_at_the_true_edges(self):
        assert ai_brief._normalize_quote('"Hello world"') == "Hello world"

    def test_surrounding_whitespace_shields_quotes_from_stripping(self):
        # Quirk inherited from the original TS: whitespace is collapsed
        # (not trimmed) before the quote-strip regex runs, and that regex is
        # anchored to the literal start/end of the string. So if raw
        # whitespace still surrounds the quotes at that point, they're no
        # longer at the boundary and survive into the output. .trim() only
        # runs after, so it can't rescue them. Preserved on purpose for
        # behavioral parity rather than "fixed", since the task was a 1:1 port.
        assert ai_brief._normalize_quote('  "Hello   world"  ') == '"Hello world"'

    def test_collapses_internal_whitespace_regardless(self):
        assert ai_brief._normalize_quote("Hello    world") == "Hello world"

    def test_trims_to_eighteen_words(self):
        long_quote = " ".join(["word"] * 30)
        assert len(ai_brief._normalize_quote(long_quote).split()) == 18

    def test_empty_input_uses_fallback(self):
        assert ai_brief._normalize_quote("") == "Discipline is built by what you finish today."


class TestTrimToWords:
    def test_trims(self):
        assert ai_brief._trim_to_words("one two three four", 2) == "one two"

    def test_shorter_than_limit_is_unchanged(self):
        assert ai_brief._trim_to_words("one two", 5) == "one two"


class TestNormalizeMotivation:
    def test_pads_a_single_line_up_to_two(self):
        result = ai_brief._normalize_motivation("Just one line.", is_grace_period=False, username="Shub")
        assert len(result.split("\n")) == 2

    def test_grace_period_default_mentions_username(self):
        result = ai_brief._normalize_motivation("", is_grace_period=True, username="Shub")
        assert "Shub" in result

    def test_caps_at_three_lines(self):
        text = "One thing. Two thing. Three thing. Four thing. Five thing."
        result = ai_brief._normalize_motivation(text, is_grace_period=False, username="Shub")
        assert len(result.split("\n")) == 3


class TestSanitizeSentence:
    def test_adds_period_when_missing(self):
        assert ai_coach._sanitize_sentence("no punctuation here") == "no punctuation here."

    def test_keeps_existing_punctuation(self):
        assert ai_coach._sanitize_sentence("already done!") == "already done!"

    def test_blank_input_stays_blank(self):
        assert ai_coach._sanitize_sentence("   ") == ""

    def test_respects_max_words(self):
        text = " ".join(["word"] * 30)
        assert len(ai_coach._sanitize_sentence(text, max_words=5).rstrip(".").split()) == 5


class TestNormalizeDateMentions:
    def test_iso_date(self):
        text = "Best day was 2026-02-22 with a great score."
        assert "22 feb 2026" in ai_coach._normalize_date_mentions(text)

    def test_month_day_year(self):
        assert "22 feb 2026" in ai_coach._normalize_date_mentions("It happened on February 22, 2026.")

    def test_day_month_year(self):
        assert "22 feb 2026" in ai_coach._normalize_date_mentions("It happened on 22 February 2026.")

    def test_abbreviated_month_still_normalizes(self):
        assert "22 feb 2026" in ai_coach._normalize_date_mentions("22 Feb 2026 was rough.")

    def test_leaves_unrelated_text_untouched(self):
        text = "No dates mentioned here at all."
        assert ai_coach._normalize_date_mentions(text) == text


class TestEnforceTimelineMath:
    def _ctx(self, **overrides):
        base = {
            "user_id": "Shub",
            "discipline_index": 75,
            "best_day_date": "2026-02-20",
            "best_day_score": 90,
            "dead_streak_start_date": "",
        }
        base.update(overrides)
        return base

    def test_today_line_is_always_deterministic_regardless_of_ai_input(self):
        result = ai_coach._enforce_timeline_math({"today": "the AI said whatever it wanted"}, self._ctx())
        assert result["today"] == "Shub, today's Discipline Index (7-day average) is 75/100."

    def test_best_day_gets_score_appended(self):
        result = ai_coach._enforce_timeline_math({}, self._ctx())
        assert "90/100" in result["2026-02-20"]

    def test_index_terminology_replaced_on_non_today_dates(self):
        comments = {"2026-02-15": "Your index was low that day."}
        result = ai_coach._enforce_timeline_math(comments, self._ctx())
        assert "index" not in result["2026-02-15"].lower()
        assert "daily weighted score" in result["2026-02-15"].lower()

    def test_dead_streak_date_included_when_present(self):
        result = ai_coach._enforce_timeline_math({}, self._ctx(dead_streak_start_date="2026-02-10"))
        assert "0/100" in result["2026-02-10"]

    def test_dead_streak_key_omitted_when_no_dead_streak(self):
        result = ai_coach._enforce_timeline_math({}, self._ctx(dead_streak_start_date=""))
        assert "2026-02-10" not in result
