#!/usr/bin/env bash
# A szerveren futó telepítő. A GitHub Actions ezt hívja meg SSH-n,
# de kézzel is futtatható: ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Friss kód lehúzása"
# --ff-only: ha a szerveren kézi módosítás van, inkább szóljon, mint hogy eldobja.
git pull --ff-only

echo "==> Konténerek újraépítése"
docker compose up -d --build

echo "==> Várakozás az API-ra"
# A /api/users/count nyilvános, és a Caddy proxyn keresztül megy,
# tehát egyszerre ellenőrzi a frontendet, a backendet és az adatbázist.
for _ in $(seq 1 30); do
    if curl -fsS http://localhost/api/users/count > /dev/null; then
        echo "==> Sikeres telepítés"
        docker image prune -f
        exit 0
    fi
    sleep 5
done

echo "HIBA: az API 150 másodperc alatt sem válaszolt" >&2
docker compose ps >&2
docker compose logs --tail 50 backend >&2
exit 1
