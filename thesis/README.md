# Length checker

A small FastAPI app. The page at `/terjedelem` posts a draft here and draws the counts. Word and sentence rules stay in this process, so the browser cannot drift from the tests.

## Run it

From `thesis/`, with Python 3.11 or newer. If `python` opens the Microsoft Store, use `py -3` instead:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8091
```

Interactive docs: [http://localhost:8091/docs](http://localhost:8091/docs).

Then start the frontend and open [http://localhost:5173/terjedelem](http://localhost:5173/terjedelem). Vite sends `/api/thesis` to port 8091. `/api/points` still goes to the points service, and every other `/api` path goes to the Java backend. Those two prefixes have to be listed before `/api`.

Tests:

```powershell
py -3 -m pytest
```

## How a count is made

`find_words` walks the text with Unicode categories. Letters (`L`) and digits (`Nd`) are word characters, so `ö` and `é` are not boundaries. A splitter that only allows `A` to `Z` breaks `összegzés` apart.

`find_sentence_spans` treats `!`, `?`, `…`, and `.` as ends. It skips a period when the period sits between digits, when the letters in front of it are an abbreviation (`pl.`, `stb.`, `dr.`), or when they are a single initial (`A.`).

Reading time uses 200 words a minute, rounded up to the next second. A character limit counts every character, including spaces, which is how thesis abstracts are usually limited.

## Try this

Add `ill.` to a sentence in `tests/test_checker.py` and confirm it does not become a new sentence. Then remove `ill` from `ABBREVIATIONS` in `app/checker.py` and watch that test fail. That is the list to extend when a faculty abbreviation is being split in two.
