#!/usr/bin/env bash
set -euo pipefail

read_env() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" .env | tail -n 1 || true)
  line=${line#*=}
  line=${line%\"}
  line=${line#\"}
  line=${line%\'}
  line=${line#\'}
  printf '%s' "$line"
}

ensure_app_db_role() {
  if [ ! -f .env ]; then
    echo "HIBA: .env hiányzik" >&2
    exit 1
  fi
  if ! grep -q '^DB_APP_PASSWORD=.\+' .env; then
    local pass
    if command -v openssl >/dev/null 2>&1; then
      pass=$(openssl rand -base64 24 | tr -d '\n=+/')
    else
      pass=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24), end="")')
    fi
    if [ -n "$(tail -c 1 .env || true)" ]; then
      printf '\n' >> .env
    fi
    printf 'DB_APP_PASSWORD=%s\n' "$pass" >> .env
  fi

  local db_user db_password app_password
  db_user=$(read_env DB_USER)
  db_password=$(read_env DB_PASSWORD)
  app_password=$(read_env DB_APP_PASSWORD)
  if [ -z "$db_user" ] || [ -z "$db_password" ] || [ -z "$app_password" ]; then
    echo "HIBA: DB_USER, DB_PASSWORD és DB_APP_PASSWORD kell a .env-ben" >&2
    exit 1
  fi

  docker compose up -d db
  local ready=0
  for _ in $(seq 1 30); do
    if docker compose exec -T -e PGPASSWORD="$db_password" db \
        pg_isready -U "$db_user" -d egyetemkapu >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [ "$ready" -ne 1 ]; then
    echo "HIBA: az adatbázis nem indult el" >&2
    exit 1
  fi

  docker compose exec -T -e PGPASSWORD="$db_password" db \
    psql -v ON_ERROR_STOP=1 -U "$db_user" -d egyetemkapu \
      -v app_pass="$app_password" -v db_user="$db_user" \
      -f - < db/app-role.sql
}

cd "$(dirname "$0")"

echo "==> Friss kód lehúzása"
git pull --ff-only

echo "==> Alkalmazás adatbázis-szerep"
ensure_app_db_role

echo "==> Konténerek újraépítése"
docker compose up -d --build

echo "==> Várakozás az API-ra"
crashloop=0
for _ in $(seq 1 30); do
    if curl -fsS --resolve egyetemkapu.hu:443:127.0.0.1 \
            https://egyetemkapu.hu/api/users/count > /dev/null; then
        echo "==> Sikeres telepítés"
        docker image prune -f
        exit 0
    fi

    restarts=$(docker inspect egyetemkapu-backend --format '{{.RestartCount}}' 2>/dev/null || echo 0)
    if [ "${restarts:-0}" -gt 3 ]; then
        echo "HIBA: a backend összeomlási ciklusban van (újraindítások: $restarts)" >&2
        crashloop=1
        break
    fi
    sleep 5
done

if [ "$crashloop" -ne 1 ]; then
    echo "HIBA: az oldal 150 másodperc alatt sem válaszolt HTTPS-en" >&2
fi
docker compose ps >&2
docker compose logs --tail 50 frontend >&2
docker compose logs --tail 150 backend >&2
exit 1
