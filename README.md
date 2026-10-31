# Egyetemkapu

A student site for Hungarian universities: calendar, calculators, notes, flashcards, and useful links in one place, so Neptun, Moodle, and faculty pages do not each need their own tab.

Live at [egyetemkapu.hu](https://egyetemkapu.hu). Sale flyers are on [akcio.egyetemkapu.hu](https://akcio.egyetemkapu.hu). The interface is Hungarian and English.

## What is in it

- Calendar with Discord and Telegram reminders
- AI assistant for short questions (Groq)
- APA, MLA, and Harvard citations
- Symbolic math: derive, integrate, simplify
- Credit index and weighted average
- Points planner: how many points a grade still needs
- Length checker for a thesis abstract or chapter
- Study room: Pomodoro timer, notes, lo-fi
- Flashcards with a simple review schedule
- Knowledge base with Hungarian full-text search; uploads wait for admin approval
- Link directory for Hungarian universities
- Idea box for missing features
- Grocery flyers, scraped and shown on the flyer site

Accounts use email and password, with optional email verification, password reset, and JWT sessions. An admin can review uploaded notes and idea-box messages.

## Stack

| Part | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Java 21, Spring Boot 4, Spring Security, Flyway |
| Python services | FastAPI. Points planner on 8090, length checker on 8091, bibliography sorter on 8092 |
| Database | PostgreSQL 15 |
| Auth | JWT access tokens and refresh cookies |
| Production | Docker Compose, Caddy (HTTPS), GitHub Actions |

## Layout

```
backend/          Spring Boot API (port 8080)
points/           Python points planner (port 8090)
thesis/           Python length checker (port 8091)
bibliography/     Python bibliography sorter (port 8092)
frontend/         React app (Vite dev server on 5173)
uploads/          Uploaded knowledge-base files (created at runtime)
docker-compose.yml
deploy.sh         Production deploy, run on the server
```

In production, Caddy serves the built frontend, proxies `/api/points/*`, `/api/thesis/*`, and `/api/bibliography/*` to the Python services, and proxies every other `/api/*` path to the Java backend. Locally, the Vite dev server does the same split: `/api/points` goes to `http://localhost:8090`, `/api/thesis` goes to `http://localhost:8091`, `/api/bibliography` goes to `http://localhost:8092`, and `/api` goes to `http://localhost:8080`. The Python prefixes have to be listed before `/api`, because the first matching prefix wins.

## Run it locally

You need Java 21, Node.js 20, and PostgreSQL 15.

Create the database (user `postgres` is the default):

```sql
CREATE DATABASE egyetemkapu;
```

Start the API from `backend/`. On Windows use `mvnw.cmd`; on macOS and Linux use `./mvnw`.

```powershell
$env:SPRING_DATASOURCE_PASSWORD = "postgres"
$env:JWT_SECRET = "local-dev-secret-at-least-32-bytes"
.\mvnw.cmd spring-boot:run
```

The default profile is `local`. Flyway applies `backend/src/main/resources/db/migration` on startup. Swagger UI is at [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html). It is turned off in the `prod` profile.

The points planner is optional for the rest of the site. From `points/`, with Python 3.11 or newer. On this machine `python` is the Store alias, so the launcher is `py -3`:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8090
```

Its own docs are at [http://localhost:8090/docs](http://localhost:8090/docs). The page is [http://localhost:5173/pontok](http://localhost:5173/pontok) once the frontend is running. Details and a small exercise are in `points/README.md`.

The length checker is the same kind of service, on port 8091. From `thesis/`, repeat the venv and install steps, then `uvicorn app.main:app --reload --port 8091`. The page is [http://localhost:5173/terjedelem](http://localhost:5173/terjedelem). Details are in `thesis/README.md`.

The bibliography sorter is on port 8092. From `bibliography/`, repeat the venv and install steps, then `uvicorn app.main:app --reload --port 8092`. The page is [http://localhost:5173/irodalomjegyzek](http://localhost:5173/irodalomjegyzek). Details are in `bibliography/README.md`.

Then the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Without `JWT_SECRET`, the API generates a new signing key on every start, so existing logins stop working after a restart. Set a secret of at least 32 bytes and keep it stable.

The AI assistant, Telegram reminders, password-reset email, and reCAPTCHA stay off until their variables are set. Discord reminders only need a webhook URL saved in Settings.

## Configuration

Copy what you need into the environment (or a gitignored `.env` next to `docker-compose.yml` for production). Do not commit secrets.

| Variable | Used for |
| --- | --- |
| `SPRING_DATASOURCE_URL` | JDBC URL. Default `jdbc:postgresql://localhost:5432/egyetemkapu` |
| `SPRING_DATASOURCE_USERNAME` | Database user. Default `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `JWT_SECRET` | HMAC key for access tokens. Required in production, at least 32 bytes |
| `AI_API_KEY` | Groq API key for the assistant |
| `TELEGRAM_BOT_TOKEN` | Bot token for deadline reminders |
| `APP_PUBLIC_URL` | Site URL written into reset and verification emails |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | SMTP. Mail is skipped when `MAIL_HOST` is empty |
| `EMAIL_VERIFICATION_ENABLED` | `true` requires a verified address before login |
| `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` | reCAPTCHA on the idea box |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `APP_TRUSTED_PROXIES` | Proxies whose `X-Forwarded-For` is trusted |
| `APP_AUTH_COOKIE_SECURE` | Send the refresh cookie only over HTTPS. `true` in production |

`backend/src/main/resources/application-local.properties` is gitignored, so machine-specific overrides can live there.

## Tests

Backend, from `backend/`:

```powershell
.\mvnw.cmd test
```

Points service, from `points/`, the length checker, from `thesis/`, and the bibliography sorter, from `bibliography/`:

```powershell
py -3 -m pytest
```

Frontend unit tests and Playwright, from `frontend/`:

```powershell
npm test
npm run test:e2e
```

Playwright starts the Vite server if it is not already running, and runs Chromium, Firefox, and WebKit. Install the browsers once with `npx playwright install`.

## Production

`docker-compose.yml` runs Postgres, the Java API, the three Python services, Caddy, and a local Grafana board (Tempo for traces, Prometheus for the three panels). Grafana listens on `127.0.0.1:3000`. Each Python service has a health check. If one of them is down, that tool's page says so, and the rest of the site still answers. The frontend container listens on 80 and 443 and terminates TLS for `egyetemkapu.hu`, `www.egyetemkapu.hu`, and `akcio.egyetemkapu.hu`.

A push to `main` SSHes to the server and runs `deploy.sh`, which pulls with `--ff-only`, rebuilds the containers, and checks `https://egyetemkapu.hu/api/users/count`. The workflow secrets are `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, and `DEPLOY_KNOWN_HOSTS`. `DEPLOY_PATH` must be an absolute path.
