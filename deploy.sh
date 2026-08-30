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
# A --resolve a saját gépre irányítja a kérést, de megtartja a domain nevet,
# így a Caddy site block, a TLS tanúsítvány, a backend és az adatbázis is
# egyszerre ellenőrződik. Az első deploynál a Let's Encrypt igénylés
# néhány másodpercig tarthat, ezért próbálkozunk újra.
for _ in $(seq 1 30); do
    if curl -fsS --resolve egyetemkapu.hu:443:127.0.0.1 \
            https://egyetemkapu.hu/api/users/count > /dev/null; then
        echo "==> Sikeres telepítés"
        docker image prune -f
        exit 0
    fi
    sleep 5
done

echo "HIBA: az oldal 150 másodperc alatt sem válaszolt HTTPS-en" >&2
docker compose ps >&2
docker compose logs --tail 50 frontend >&2
docker compose logs --tail 50 backend >&2
exit 1
