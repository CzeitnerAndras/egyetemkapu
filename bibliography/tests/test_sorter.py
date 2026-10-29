import pytest

from app.sorter import SortError, sort_entries, tokenize


def test_digraphs_and_long_digraphs_are_single_letters():
    assert tokenize("Csányi") == ("cs", "á", "ny", "i")
    assert tokenize("Nagy") == ("n", "a", "gy")
    assert tokenize("hosszú") == ("h", "o", "sz", "sz", "ú")
    assert tokenize("lassú") == ("l", "a", "s", "s", "ú")
    assert tokenize("asszony") == ("a", "sz", "sz", "o", "ny")
    assert tokenize("dzsungel") == ("dzs", "u", "n", "g", "e", "l")


def test_punctuation_and_case_do_not_change_the_key():
    assert tokenize("Kovács, Anna") == tokenize("kovács anna")
    assert tokenize("Kovács-Szabó") == ("k", "o", "v", "á", "cs", "sz", "a", "b", "ó")


def test_builtin_order_puts_cs_and_sz_in_the_wrong_place():
    names = ["Csányi", "Czakó", "Szabó", "Sáros"]

    assert sorted(names) == ["Csányi", "Czakó", "Szabó", "Sáros"]
    assert sort_entries(names) == ["Czakó", "Csányi", "Sáros", "Szabó"]


def test_c_comes_before_cs_and_s_before_sz():
    assert sort_entries(["család", "cékla"]) == ["cékla", "család"]
    assert sort_entries(["Csaba", "Czakó"]) == ["Czakó", "Csaba"]
    assert sort_entries(["Szabó", "Sáros", "Sipos"]) == ["Sáros", "Sipos", "Szabó"]


def test_n_comes_before_ny_and_a_before_a_acute():
    assert sort_entries(["Nyírő", "Nagy"]) == ["Nagy", "Nyírő"]
    assert sort_entries(["Ádám", "Antal"]) == ["Antal", "Ádám"]


def test_accented_vowels_follow_the_plain_ones():
    assert sort_entries(["Öreg", "Ónod", "Olga", "Ősz"]) == ["Olga", "Ónod", "Öreg", "Ősz"]
    assert sort_entries(["Üveg", "Új", "Ugró", "Űr"]) == ["Ugró", "Új", "Üveg", "Űr"]


def test_the_year_orders_the_same_author():
    assert sort_entries([
        "Kovács, Anna (2020). Második kiadás.",
        "Kovács, Anna (2019). Első kiadás.",
    ]) == [
        "Kovács, Anna (2019). Első kiadás.",
        "Kovács, Anna (2020). Második kiadás.",
    ]


def test_equal_keys_keep_the_pasted_order():
    lines = ["Kovács, Anna (2020). A ház.", "Kovács Anna (2020). A ház."]

    assert sort_entries(lines) == lines
    assert sort_entries(list(reversed(lines))) == list(reversed(lines))


def test_blank_lines_are_dropped():
    assert sort_entries(["", "  Szabó  ", "", "Antal"]) == ["Antal", "Szabó"]


def test_empty_and_oversized_lists_are_rejected():
    with pytest.raises(SortError) as empty:
        sort_entries(["", "   "])
    assert empty.value.code == "empty_text"

    with pytest.raises(SortError) as many:
        sort_entries(["Antal"] * 1001)
    assert many.value.code == "too_many"


def test_a_reference_list_sorts_by_the_author():
    scrambled = [
        "Szabó, Anna (2020). A város.",
        "Sipos, Béla (2018). A folyó.",
        "Csányi, Péter (2019). A híd.",
        "Czakó, Eszter (2021). A kert.",
        "Nagy, Imre (2017). A hegy.",
        "Nyírő, Júlia (2016). A rét.",
        "Sáros, Kata (2013). A part.",
        "Ádám, Gábor (2015). A tó.",
        "Antal, Béla (2014). A ház.",
    ]

    assert sort_entries(scrambled) == [
        "Antal, Béla (2014). A ház.",
        "Ádám, Gábor (2015). A tó.",
        "Czakó, Eszter (2021). A kert.",
        "Csányi, Péter (2019). A híd.",
        "Nagy, Imre (2017). A hegy.",
        "Nyírő, Júlia (2016). A rét.",
        "Sáros, Kata (2013). A part.",
        "Sipos, Béla (2018). A folyó.",
        "Szabó, Anna (2020). A város.",
    ]
