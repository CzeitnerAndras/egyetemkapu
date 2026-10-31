"""Word, sentence, and reading-time counts for a thesis draft.

A word is a run of letters and digits. Hungarian letters stay inside the
word, so ``összegzés`` is one word. A hyphen or an apostrophe joins two
runs (``szak-dolgozat``). A dot or a comma joins digits (``3.14``, ``3,14``).

A sentence ends at ``!``, ``?``, ``…``, or a period. The period in a
decimal, in ``pl.``, and in an initial such as ``A.`` does not end one.
"""

import math
import unicodedata

READING_WPM = 200
MAX_TEXT_LENGTH = 200_000

# Lowercased, without the period. Single initials are handled separately.
ABBREVIATIONS = frozenset({
    "dr", "prof", "pl", "stb", "ún", "ill", "kb", "ui", "tv", "sz",
    "old", "ld", "vö", "im", "cf", "etc", "ca", "fig", "no", "nr",
    "vol", "pp", "ed", "eds", "mr", "mrs", "ms", "jr", "sr",
    "phd", "msc", "bsc",
})
JOINERS = frozenset("-‐‑'’ʼ")
TERMINATORS = frozenset("?!")
ELLIPSIS = frozenset("…⋯")


class LengthError(Exception):
    """Text the checker refuses to count. ``code`` is for the API client."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


class LengthReport:
    def __init__(
        self,
        words: int,
        characters: int,
        characters_no_spaces: int,
        sentences: int,
        paragraphs: int,
        longest_sentence_words: int,
        longest_sentence: str,
        reading_seconds: int,
        reading_wpm: int,
        word_limit: int | None,
        words_over: int,
        word_status: str,
        character_limit: int | None,
        characters_over: int,
        character_status: str,
    ) -> None:
        self.words = words
        self.characters = characters
        self.characters_no_spaces = characters_no_spaces
        self.sentences = sentences
        self.paragraphs = paragraphs
        self.longest_sentence_words = longest_sentence_words
        self.longest_sentence = longest_sentence
        self.reading_seconds = reading_seconds
        self.reading_wpm = reading_wpm
        self.word_limit = word_limit
        self.words_over = words_over
        self.word_status = word_status
        self.character_limit = character_limit
        self.characters_over = characters_over
        self.character_status = character_status


def check_text(
    text: str,
    word_limit: int | None = None,
    character_limit: int | None = None,
) -> LengthReport:
    if text.strip() == "":
        raise LengthError("empty_text")
    if len(text) > MAX_TEXT_LENGTH:
        raise LengthError("too_long")
    _check_limit(word_limit)
    _check_limit(character_limit)

    words = find_words(text)
    sentence_texts = [text[start:end].strip() for start, end in find_sentence_spans(text)]
    longest = ""
    longest_words = 0
    for sentence in sentence_texts:
        count = len(find_words(sentence))
        if count > longest_words:
            longest = sentence
            longest_words = count

    word_count = len(words)
    characters = len(text)
    characters_no_spaces = sum(1 for ch in text if not ch.isspace())
    word_status, words_over = _limit_status(word_count, word_limit)
    character_status, characters_over = _limit_status(characters, character_limit)

    return LengthReport(
        words=word_count,
        characters=characters,
        characters_no_spaces=characters_no_spaces,
        sentences=len(sentence_texts),
        paragraphs=_paragraph_count(text),
        longest_sentence_words=longest_words,
        longest_sentence=longest,
        reading_seconds=_reading_seconds(word_count),
        reading_wpm=READING_WPM,
        word_limit=word_limit,
        words_over=words_over,
        word_status=word_status,
        character_limit=character_limit,
        characters_over=characters_over,
        character_status=character_status,
    )


def find_words(text: str) -> list[str]:
    """Return the words in reading order."""
    words: list[str] = []
    index = 0
    length = len(text)
    while index < length:
        if not _is_word_char(text[index]):
            index += 1
            continue
        start = index
        index += 1
        while index < length:
            character = text[index]
            if _is_word_char(character):
                index += 1
                continue
            if character in JOINERS and index + 1 < length and _is_word_char(text[index + 1]):
                index += 1
                continue
            if character in ".," and _is_digit(text[index - 1]) and index + 1 < length and _is_digit(text[index + 1]):
                index += 1
                continue
            break
        words.append(text[start:index])
    return words


def find_sentence_spans(text: str) -> list[tuple[int, int]]:
    """Return ``[start, end)`` slices. ``end`` sits just after the terminator."""
    ends: list[int] = []
    index = 0
    length = len(text)
    while index < length:
        character = text[index]
        if character in TERMINATORS:
            ends.append(index + 1)
            index += 1
            continue
        if character in ELLIPSIS:
            ends.append(index + 1)
            index += 1
            continue
        if character == ".":
            run = 1
            while index + run < length and text[index + run] == ".":
                run += 1
            if run == 1 and (
                _is_decimal_point(text, index)
                or _number_point_continues(text, index)
                or _is_abbreviation(text, index)
            ):
                index += 1
                continue
            ends.append(index + run)
            index += run
            continue
        index += 1

    spans: list[tuple[int, int]] = []
    start = 0
    for end in ends:
        if find_words(text[start:end]):
            spans.append((start, end))
        start = end
        while start < length and text[start].isspace():
            start += 1
    if start < length and find_words(text[start:]):
        spans.append((start, length))
    return spans


def _is_word_char(character: str) -> bool:
    category = unicodedata.category(character)
    return category.startswith("L") or category == "Nd"


def _is_digit(character: str) -> bool:
    return unicodedata.category(character) == "Nd"


def _is_decimal_point(text: str, dot_index: int) -> bool:
    return (
        dot_index > 0
        and dot_index + 1 < len(text)
        and _is_digit(text[dot_index - 1])
        and _is_digit(text[dot_index + 1])
    )


def _number_point_continues(text: str, dot_index: int) -> bool:
    """A period after a figure number, as in ``a 3. ábrát``, is not a sentence end.

    ``A válasz 42. Ez új.`` still splits, because the next word is capitalized.
    A number at the very end (``A válasz 42.``) stays a sentence end.
    """
    if dot_index == 0 or not _is_digit(text[dot_index - 1]):
        return False
    cursor = dot_index + 1
    while cursor < len(text) and text[cursor].isspace():
        cursor += 1
    if cursor >= len(text):
        return False
    return unicodedata.category(text[cursor]).startswith("L") and text[cursor].islower()


def _is_abbreviation(text: str, dot_index: int) -> bool:
    end = dot_index
    start = end
    while start > 0 and unicodedata.category(text[start - 1]).startswith("L"):
        start -= 1
    token = text[start:end].casefold()
    if token == "":
        return False
    return len(token) == 1 or token in ABBREVIATIONS


def _paragraph_count(text: str) -> int:
    blocks = text.split("\n\n")
    return sum(1 for block in blocks if find_words(block))


def _reading_seconds(word_count: int) -> int:
    if word_count == 0:
        return 0
    return math.ceil(word_count / READING_WPM * 60)


def _check_limit(limit: int | None) -> None:
    if limit is not None and limit < 1:
        raise LengthError("limit_not_positive")


def _limit_status(actual: int, limit: int | None) -> tuple[str, int]:
    if limit is None:
        return "unset", 0
    if actual <= limit:
        return "within", 0
    return "over", actual - limit
