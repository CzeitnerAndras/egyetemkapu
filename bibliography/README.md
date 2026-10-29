# Bibliography sorter

A small FastAPI app. The page at `/irodalomjegyzek` posts one reference per line, and this service returns them in Hungarian alphabetical order. Ordinary `sorted()` is not that order.

## Run it

From `bibliography/`, with Python 3.11 or newer. If `python` opens the Microsoft Store, use `py -3` instead:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8092
```

Interactive docs: [http://localhost:8092/docs](http://localhost:8092/docs).

Then start the frontend and open [http://localhost:5173/irodalomjegyzek](http://localhost:5173/irodalomjegyzek). Vite sends `/api/bibliography` to port 8092. The other `/api/...` prefixes still go to the points service, the length checker, and the Java backend. Every Python prefix has to be listed before `/api`.

Tests:

```powershell
py -3 -m pytest
```

## Why `sorted()` is wrong here

Unicode puts `s` then whatever character follows. `Szabó` is `S` + `z`, and `z` comes before `á`, so `sorted()` places `Szabó` before `Sáros`. In Hungarian `sz` is one letter, and it comes after `s`, so `Sáros` comes first.

The same split happens with `c` and `cs`: `sorted()` puts `Csányi` before `Czakó`, because `s` comes before `z`. Hungarian puts every `c` before every `cs`, so `Czakó` comes first.

`tokenize` walks the line and emits those letters. A long digraph doubles the first character: `ssz` in `hosszú` is `sz` + `sz`, not `s` + `sz`. Commas and spaces are skipped, so the comma after a surname does not change the place.

## Try this

Add `Tóth` and `Tyukodi` to `tests/test_sorter.py`. `ty` is one letter and comes after `t`, so `Tóth` comes first. Then change the matcher so `ty` is read as `t` + `y` and watch that test fail.
