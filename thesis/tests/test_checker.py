import pytest

from app.checker import LengthError, check_text, find_words


def test_hungarian_word_stays_in_one_piece():
    assert find_words("összegzés") == ["összegzés"]
    assert find_words("Árvíztűrő tükörfúrógép") == ["Árvíztűrő", "tükörfúrógép"]


def test_hyphen_apostrophe_and_decimal_separators_join_a_word():
    assert find_words("szak-dolgozat") == ["szak-dolgozat"]
    assert find_words("well-known") == ["well-known"]
    assert find_words("3.14 és 3,14") == ["3.14", "és", "3,14"]


def test_abbreviation_and_decimal_do_not_split_the_sentence():
    report = check_text("Ld. pl. a 3,14. ábrát. Kész.")

    assert report.sentences == 2
    assert report.words == 6
    assert report.longest_sentence == "Ld. pl. a 3,14. ábrát."


def test_a_figure_number_continues_and_a_capital_after_a_number_does_not():
    figure = check_text("Lásd a 3. ábrát a szövegben.")
    follow = check_text("A válasz 42. Ez már egy új mondat.")

    assert figure.sentences == 1
    assert follow.sentences == 2
    assert follow.longest_sentence == "Ez már egy új mondat."


def test_initials_are_not_sentence_ends():
    report = check_text("A. B. teszt. Kész.")

    assert report.sentences == 2
    assert report.longest_sentence == "A. B. teszt."


def test_question_and_exclamation_are_separate_sentences():
    report = check_text("Kész! Tényleg?")

    assert report.sentences == 2
    assert report.words == 2


def test_a_draft_without_a_terminator_is_still_one_sentence():
    report = check_text("még nincs pont a végén")

    assert report.sentences == 1
    assert report.longest_sentence_words == 5


def test_blank_line_starts_a_new_paragraph():
    report = check_text("Első bekezdés.\n\nMásodik bekezdés.")

    assert report.paragraphs == 2
    assert report.sentences == 2


def test_reading_time_rounds_up_to_the_next_second():
    report = check_text("szó " * 200)
    over = check_text("szó " * 201)

    assert report.words == 200
    assert report.reading_seconds == 60
    assert report.reading_wpm == 200
    assert over.reading_seconds == 61


def test_character_limit_counts_spaces():
    report = check_text("aa aa", character_limit=5)
    over = check_text("aa aa", character_limit=4)

    assert report.characters == 5
    assert report.characters_no_spaces == 4
    assert report.character_status == "within"
    assert over.character_status == "over"
    assert over.characters_over == 1


def test_word_limit_reports_how_far_over():
    report = check_text("egy két három", word_limit=2)

    assert report.word_status == "over"
    assert report.words_over == 1
    assert report.character_status == "unset"


def test_blank_text_is_rejected():
    with pytest.raises(LengthError) as error:
        check_text("   \n")
    assert error.value.code == "empty_text"


def test_the_longest_sentence_is_the_one_with_the_most_words():
    report = check_text("Rövid. Ez a hosszabb mondat a második.")

    assert report.longest_sentence_words == 6
    assert report.longest_sentence == "Ez a hosszabb mondat a második."
