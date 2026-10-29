"""Sort bibliography lines in Hungarian alphabetical order.

Hungarian treats some pairs as one letter: ``cs``, ``dz``, ``dzs``, ``gy``,
``ly``, ``ny``, ``sz``, ``ty``, ``zs``. Accented vowels are their own letters
and come after the plain one: ``a`` then ``á``, ``o``, ``ó``, ``ö``, ``ő``.

A long digraph is written by doubling the first character (``ssz`` is
``sz`` + ``sz``, as in ``hosszú``). Spaces, hyphens, and punctuation are
skipped, so ``Kovács, Anna`` and ``Kovács Anna`` share a key. Equal keys
keep the order they were pasted in.
"""

LETTER_ORDER = (
    "a", "á", "b", "c", "cs", "d", "dz", "dzs", "e", "é", "f", "g", "gy",
    "h", "i", "í", "j", "k", "l", "ly", "m", "n", "ny", "o", "ó", "ö", "ő",
    "p", "q", "r", "s", "sz", "t", "ty", "u", "ú", "ü", "ű", "v", "w", "x",
    "y", "z", "zs",
)
RANK = {letter: index for index, letter in enumerate(LETTER_ORDER)}

GEMINATES = {
    "ccs": ("cs", "cs"),
    "ddz": ("dz", "dz"),
    "ggy": ("gy", "gy"),
    "lly": ("ly", "ly"),
    "nny": ("ny", "ny"),
    "ssz": ("sz", "sz"),
    "tty": ("ty", "ty"),
    "zzs": ("zs", "zs"),
}

MAX_TEXT_LENGTH = 200_000
MAX_ENTRIES = 1000


class SortError(Exception):
    """A list the sorter refuses. ``code`` is for the API client."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def sort_entries(lines: list[str]) -> list[str]:
    cleaned = [line.strip() for line in lines if line.strip()]
    if not cleaned:
        raise SortError("empty_text")
    if len(cleaned) > MAX_ENTRIES:
        raise SortError("too_many")
    return sorted(cleaned, key=sort_key)


def sort_text(text: str) -> list[str]:
    if len(text) > MAX_TEXT_LENGTH:
        raise SortError("too_long")
    return sort_entries(text.splitlines())


def sort_key(line: str) -> tuple[int, ...]:
    return tuple(_rank(token) for token in tokenize(line))


def tokenize(text: str) -> tuple[str, ...]:
    """Break ``text`` into Hungarian letters. Punctuation is dropped."""
    folded = text.casefold()
    tokens: list[str] = []
    index = 0
    length = len(folded)
    while index < length:
        if folded.startswith("ddzs", index):
            tokens.extend(("dzs", "dzs"))
            index += 4
            continue
        geminate = GEMINATES.get(folded[index:index + 3])
        if geminate is not None:
            tokens.extend(geminate)
            index += 3
            continue
        trigraph = folded[index:index + 3]
        if trigraph in RANK:
            tokens.append(trigraph)
            index += 3
            continue
        digraph = folded[index:index + 2]
        if digraph in RANK:
            tokens.append(digraph)
            index += 2
            continue
        character = folded[index]
        if character in RANK or character.isdecimal():
            tokens.append(character)
        index += 1
    return tuple(tokens)


def _rank(token: str) -> int:
    if token in RANK:
        return 10 + RANK[token]
    if len(token) == 1 and token.isdecimal():
        return int(token)
    return 1000
