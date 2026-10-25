# Points service

A small FastAPI app. The page at `/pontok` posts a course here and draws the answer. The grade maths stays in this process, so the browser cannot drift from the tests.

## Run it

From `points/`, with Python 3.11 or newer. If `python` opens the Microsoft Store, use `py -3` instead:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8090
```

Interactive docs: [http://localhost:8090/docs](http://localhost:8090/docs).

Then start the frontend (`npm run dev` in `frontend/`) and open [http://localhost:5173/pontok](http://localhost:5173/pontok). Vite sends `/api/points` to port 8090. Every other `/api` path still goes to the Java backend on 8080.

Tests:

```powershell
python -m pytest
```

## How a request moves

1. The form posts JSON to `/api/points/plan`.
2. Vite locally, or Caddy in production, forwards that prefix to this app. The match has to come before the general `/api` rule, because the first matching prefix wins.
3. `app/main.py` checks the shape with Pydantic, then calls `plan_course`.
4. `app/planner.py` is plain Python. The tests call it without starting a server.
5. Each grade comes back as `already`, `reachable`, or `impossible`. The React page translates those words. This service does not pick a language.

A part with `"earned": null` is not marked yet. A zero is a real score.

## The rounding rule

Scores stay at hundredths of a point. The points a grade requires are rounded up, so a short fraction is never called a pass. `required_points` is the function that does it. 33.33% of 10 becomes 3.34, and 50% of 100 stays 50.

`Decimal` is used on purpose. `0.1` is not exact in binary floating point, and a pass mark should not depend on that.

## Try this

`DEFAULT_THRESHOLDS` in `app/planner.py` is 50 / 65 / 75 / 85. Change the pass mark, run `python -m pytest`, and fix or extend `test_sample_course_says_what_the_exam_still_needs` until it describes your faculty's real cutoffs. Then reload `/pontok`: the same sample (22 + 16, exam still open out of 50) will ask for a different exam score.
