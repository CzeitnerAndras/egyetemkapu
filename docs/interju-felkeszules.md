# Egyetemkapu — interjú jegyzet (aktuális)

Tanulható, hangosan elmondható anyag. Nem szótárlista: **mi miért van**, hol számol, kimegy-e idegen API-ra.

Éles: https://egyetemkapu.hu  
Akciós újság: https://akcio.egyetemkapu.hu

Három körben olvasd:

1. Pitch + rendszerrajz (1–4.)
2. Auth + Caddy útválasztás (5–6.)
3. Oldalak, szórólap, Python szolgáltatások, STAR, kérdések.

Ha elakadsz: *mit lát a user → melyik URL → kell-e süti → saját Java, saját Python, vagy idegen API.*

---

## 1. 30 másodperc

„Egyedül viszem az Egyetemkaput, egy magyar hallgatói portált. React + TypeScript a felület, Java/Spring Boot a fő API, két kicsi FastAPI szolgáltatás a ponttervezőhöz és a terjedelem-ellenőrhöz, PostgreSQL, Docker, Caddy, Hetzner. Van naptár Discord/Telegram pinggel, AI, tudástár admin jóváhagyással, kártyák, és kilenc bolt akciósújsága külön aldomainen. Auth: HttpOnly sütis JWT, Origin CSRF.”

## 2. 90 másodperc

A hallgatói infó szétszóródik: Neptun, Moodle, kari oldal, jegyzet, átlag, absztrakt-limit. Ebből csináltam egy oldalt, amit magam is használok.

A böngésző a Caddyra megy. A Caddy a statikus Reactet szolgálja, a `/api/points`-ot a Python pontszolgáltatásra (8090), a `/api/thesis`-t a terjedelem-ellenőrre (8091), minden más `/api`-t a Springre (8080). A sorrend számít: a konkrétabb prefix előbb van, különben minden a Javához menne.

Belépés után 15 perces access és 7 napos refresh, mindkettő HttpOnly süti. A refresh a DB-ben hash, rotálódik. Email-verify opcionális. A naptár percenként nézi a határidőt. Tudástár: PENDING, magic byte, UUID, admin. Szórólap: kilenc bolt, külön host, árat nem tárolok. Ponttervező: Decimal, felfelé kerekítés. Terjedelem: Unicode szó, magyar rövidítés nem vág mondatot.

## 3. Mit ne mondj elsőnek

JWT path, CSRF, Tesseract, OpenTofu. Ezekre akkor térj rá, ha kérdezik. Először: **probléma → megoldás → élesben fut → egyedül viszem.**

---

## 4. Rendszerrajz (rajzold fel papírra)

```
Böngésző
  egyetemkapu.hu          hallgatói SPA (React)
  akcio.egyetemkapu.hu    csak szórólap SPA (ugyanaz a build, más host)

        │  80/443
        ▼
     Caddy  (TLS, Let's Encrypt, security headerek)
        │
        ├── /api/thesis/*  → thesis  :8091  FastAPI  (terjedelem)
        ├── /api/points/*  → points  :8090  FastAPI  (ponttervező)
        ├── /api/*         → backend :8080  Spring Boot 21
        └── egyéb          → statikus frontend

Spring → PostgreSQL 15 (volume)
      → uploads/ (tudástár fájlok)
      → idegen: Groq, Newton, Discord, Telegram, Google reCAPTCHA, bolti források

Hetzner VPS. Deploy: GitHub Actions → SSH → deploy.sh → git pull --ff-only → compose up --build
Healthcheck: HTTPS /api/users/count a saját 127.0.0.1-re, domain névvel (--resolve).
```

**Miért két Python, nem minden Java?**  
A pont- és szószámolás **szabály**, nem CRUD. Tesztelni akarom a képletet HTTP nélkül. FastAPI + Pydantic + pytest erre rövidebb. A Caddy/Vite a prefix alapján irányít — a böngészőnek egy origin marad, `/api/...`.

**Miért külön domain a szórólapnak?**  
Más közönség, más kinézet, a hallgatói menü nem kell. Ugyanaz a React build: ha a hostname `akcio.egyetemkapu.hu`, csak a szórólap renderelődik. Az `egyetemkapu.hu/akcios-ujsag` productionben átirányít az aldomainre. A `/api/flyers` továbbra is a Javán van; a Caddy az akció-hoston is proxizza.

---

## 5. Auth — elmondható 90 mp

Régen JWT localStorage: XSS-sel ellopható. Most:

- Login JSON: `{ ok: true }`, token a `Set-Cookie`-ban.
- `ek_access` — 15 perc, path `/api`, HttpOnly, SameSite=Lax, Secure prod.
- `ek_refresh` — 7 nap, path **csak** `/api/auth`, hash a DB-ben, használatkor rotáció.
- Író kérés: Origin/Referer a saját domain (CSRF). CORS ≠ CSRF.
- Enumeration-safe login/reg: ugyanaz a hiba, ha a user nincs vagy rossz a jelszó.
- Rate limit: login/reg/verify/forgot IP alapján, trusted proxy-ból (`X-Forwarded-For` a Caddytól).
- Prod: `JwtSecretGuard`, Swagger ki, cookie Secure.

401 az accessen: frontend `POST /api/auth/refresh`, aztán **újracsinálja** az eredeti kérést. Párhuzamos 401: egy `refreshPromise`.

---

## 6. Caddy — a „hogyan nem keveredik a három API”

A reverse proxy **az első illeszkedő szabályt** viszi. Ezért:

1. `/api/thesis/*` → 8091  
2. `/api/points/*` → 8090  
3. `/api/*` → 8080  

Ha a 3. lenne elöl, a ponttervező a Springre menne, 404. Lokálisan a Vite ugyanezt csinálja a `vite.config.ts`-ben.

Headerek: HSTS, nosniff, DENY frame, CSP. YouTube csak a tanulószoba iframe-hez.

---

## 7. Oldalak — képernyő, API, hol számol

### Főoldal `/`

Hírek: `GET /api/events` (DB, admin írja).  
Jóváhagyott jegyzetek: `GET /api/documents`.  
Matekhasználat-szám: `GET /api/tools/calculator/count` (audit log).  
Bejelentkezve: `GET /api/users/me`.  
Háttér: `POST /api/users/heartbeat` — tanulószoba létszám.  
Az AI-mező **nem** itt kérdez: localStorage-ba teszi a szöveget, átvisz `/ai`-ra.

### Belépés / reg / jelszó / email

Saját `/api/auth/...`. Jelszó BCrypt. Süti, nem localStorage token. Elfelejtett jelszó: mail, opcionálisan Telegram.

### Naptár `/naptar`

Belépés kell. CRUD: `/api/tasks`. Discord webhook / Telegram chat ID a beállításokban. **A ping nem kattintáskor megy:** percenkénti cron. 1–168 órával előtte + a határidő percében. Idegen API: Discord, Telegram Bot.

### Kalkulátor `/kalkulator`

**Kreditátlag.** Képlet: Σ(kredit×jegy) / Σ kredit. A böngésző azonnal számol, aztán `POST /api/calculator/weighted-average` a Javán ugyanazzal. Belépés nem kell. Nincs idegen API.

**Matek** (derivál, integrál, gyök, egyszerűsít…). Belépés kell. Java **nem** derivál: `GET /api/tools/calculator/{op}/{képlet}` → **Newton API** (`newton.vercel.app`). Rate limit ~5/perc/user.

Mondat: „Az átlagt nálam számolja a gép. A deriváltat a Newton, én csak továbbítom.”

### Ponttervező `/pontok` — új, Python

Kérdés: „ZH 22/30, beadandó 16/20, vizsga még nincs, max 50. Hány pont kell a ketteshez / ötösig?”

`POST /api/points/plan` → FastAPI 8090. Nem a Spring.

Részek: név, max, `earned` szám vagy `null` (még nincs megírva). **A nulla pont, a null nincs megírva.** Küszöb alapból 50 / 65 / 75 / 85 (2–5).

Státusz jegyekre: `already` / `reachable` / `impossible`. A React fordítja magyarra; a Python nyelvfüggetlen.

**Miért Decimal, miért ROUND_CEILING:** a `0.1` bináris floatban nem tized. 33,33% a 10-ből 3,333 → felfelé 3,34, soha ne mondjuk átmentnek a hiányos tört miatt. 50% a 100-ból marad 50,00.

Max 12 rész, max 2 tizedes. Hibakódok (pl. `earned_above_max`) — a UI kulcsra fordít.

### Terjedelem `/terjedelem` — új, Python

Absztrakt / fejezet: szó, karakter (szóközzel is — így limitelik az absztraktot), mondat, bekezdés, leghosszabb mondat, olvasási idő (200 szó/perc, felfelé másodpercre).

`POST /api/thesis/check` → FastAPI 8091.

**Szó:** Unicode betű + szám. Az `összegzés` **egy** szó, nem törik az ö-nél. Kötőjel/aposztróf összetart (`szak-dolgozat`). Tizedes: `3,14` és `3.14`.

**Mondat:** `! ? … .` A pont **nem** zár, ha számok között van, ha rövidítés (`pl. stb. dr. ill.`), vagy egybetűs kezdő (`A.`).

Max 200 000 karakter. Üres szöveg 400.

### AI `/ai`

Belépés. `POST /api/ai/ask` → Java → **Groq** (`api.groq.com`, modell `openai/gpt-oss-120b`). Kulcs a szerveren. Max 4000 karakter, rate limit. A Java nem „gondolkodik”.

### Tudástár `/tudastar`

Lista belépés nélkül: csak APPROVED. Feltöltés: belépés, max 10 MB, pdf/jpg/png, **magic byte** (nem a kiterjesztés), UUID név, `uploads/` a Hetzneren, PENDING. Admin engedélyezi. Path traversal ellen: `startsWith(uploads)`.

### Hivatkozás `/hivatkozas`

Belépés. `POST /api/tools/reference/generate`. Java **sablon**: APA / MLA / Harvard. Nincs Crossref.

### Tanulószoba `/tanuloszoba`

Időzítő a **böngészőben**. Taskok + privát jegyzetek (`/api/notes`, nem a tudástár). Heartbeat: ki van bent.

### Kártyák `/kartyak`

Belépés, saját DB. 40 pakli, 200 kártya, 80/1000 karakter. `again` → 10 perc. `good` → intervallum ×2, max 60 nap. Nincs Anki-szerver.

### Linktár `/linktar`

Nincs API. Egyetem-linkek a frontend kódban. Kattintás = idegen egyetemi oldal.

### Ötletláda `/otletlada`

reCAPTCHA (Google) + `POST /api/suggestions`. V15: a `user_id` lehet null — vendég is írhat. Admin látja/törli.

### Profil / beállítások

User CRUD, Discord webhook, Telegram chat ID, nyelv (localStorage + szerver).

### Rólunk / GYIK

Szöveg + i18n. Stack a Rólunkon: React, TS, Vite, Tailwind / Java, Spring, **Python, FastAPI**, Postgres, JWT, Docker, Caddy.

### Admin

Pending dokumentum, ötlet, hír. Csak te.

### Titkos `/S3CR3T`

Böngészős terminál. Jegyzetek ugyanaz a `/api/notes`. `localStorage.terminalHacked`.

---

## 8. Akciós újság — a „legmenőbb” rész, most 9 bolt

Külön site: **akcio.egyetemkapu.hu**. Cron 6:30 (Budapest). User kereséskor **nem** tölti a bolt PDF-jét: a saját Postgresben keres. **Árat nem tárolok** (V11). Bevásárlólista: `localStorage`, nem a szerver. Oldalkép: backend proxy, URL allowlist (SSRF ellen).

Három nyersanyag:

1. **Publitas JSON** (`data.json` + `spreads.json`) — dobozos szöveg + kép.  
2. **PDF text layer** — PDFBox TextRun: x, y, font, méret. Nem OCR.  
3. **Kép** — Tesseract (Coop).

### Boltanként

**Aldi — Publitas.** `aldi.hu/online-akcios-ujsag` → lapozó. Doboz = üres sor. NAGYBETŰS név, alatta kiszerelés/ár. Sajátmárka külön doboz, a JSON nem tartja a vizuális sorrendet → brand-párosító. PDF-tartalék: oszlop + stack.

**Spar — PDF + betű.** Poppins Bold/SemiBold 7,5–13,5 pt a név. Regular = leírás, ExtraBold = ár. Íves „KEDVEZMÉNY” szótagok összeragasztva, aztán kidobva.

**Tesco — GraphQL, majd PDF.** POST `api.prod.retail.tesco.com/.../graphql`, `getValidLeafletList`, country `hu`. Meta + oldalkép. Név: PDF, **TESCOModern-Bold 6,6–8,5 pt**.

**Penny — lánc.** Rewe FlippingBook text layer, vagy Publitas, vagy PDF, vagy HTML ajánlat. NAGYBETŰ regex, szlogen szűrő.

**Auchan — iPaper.** HTML-ben `window.staticSettings`: oldal szöveg + kép. Bold név vagy CAPS regex.

**Coop — kép, OCR.** Publitas gyakran üres. Oldalkép → Tesseract, csempék (bal/jobb + alsó közép), confidence &lt; 40 kiesik. Szavak közelség szerint csoport (max 8 szó). `pidk` → Pick.

**Lidl — új, PDF betű.** Áttekintő HTML → flyer API → PDF. Név: **LidlFontCondPro-Bold 7,5–12,5 pt**. Márka külön sor felette. Regular = kiszerelés, LidlFontPrice = Ft, felkiáltójel = szlogen, kidobva. Nyers szövegút szándékosan üres.

**Rossmann — új, magazin JSON + PDF layout.** Lista: `magazin.microservices.rossmann.hu/api/magazines` → detail JSON (oldalképek webp) + PDF. A név a **polcár feletti** bold sorokból (`RossmannPrintedNames`): ár horog, fölötte a kártya, méret/cikkszám kiesik.

**DM — új, Publitas + hotspot.** DM shop magazin oldal → Publitas spreads + `page/N/hotspots_data.json`. A hotspot a kattintható ajánlat; abból termék.

Kilenc extractor: strategy (`FlyerExtractorRegistry`). Rossmann layout a `RossmannPrintedNames`, DM a parser hotspotjai, Lidl a registryben.

**Mondat:** „Kilenc újság, nem egy parser. Aldi/DM JSON-doboz. Spar/Tesco/Lidl a **betűtípus**. Tesco előtt GraphQL. Coop kép+OCR. Rossmann az ár feletti név. Én a nevet teszem el, a keresés nálam fut.”

---

## 9. Biztonság, röviden

| Téma | Mit csinálsz |
|---|---|
| XSS tokenlopás | HttpOnly süti, nem localStorage |
| CSRF | Origin/Referer allowlist |
| Brute force | Bucket4j rate limit, lockout |
| SSRF (szórólap) | URL allowlist, proxy |
| Feltöltés | magic byte, UUID, path prefix |
| Secret prod | JwtSecretGuard, Swagger ki |
| Proxy IP | trusted proxies, Caddy X-Forwarded-For |

---

## 10. Deploy és hol vannak a fájlok

**Hol a gép:** Hetzner VPS.  
**Hogyan a kód:** push `main` → GitHub Actions → SSH secret kulccsal → `deploy.sh`.  
**Mit csinál a script:** `git pull --ff-only`, `docker compose up -d --build`, 30×5 mp HTTPS healthcheck.

Compose: `db`, `backend`, **`points`**, **`thesis`**, `frontend` (Caddy). Frontend vár a három API-ra. Portok localhoston: 8080, 8090, 8091 — kifelé 80/443 a Caddy.

**Fájlok a Hetzneren:** kódklón, Postgres volume, Caddy cert volume, `uploads/`. Nincs S3. A GitHub a kód forrása; az **adat** a VPS-en van.

Nincs Google Analytics. Sütik authra mennek.

---

## 11. Hol mi számol — egy táblázat

| Dolog | Hol | Idegen? |
|---|---|---|
| Kreditátlag | Böngésző + Java, ugyanaz | Nem |
| Matek | Java továbbít | Newton |
| Ponttervező | FastAPI Decimal | Nem |
| Terjedelem | FastAPI Unicode | Nem |
| AI | Java továbbít | Groq |
| Naptár ping | Java cron | Discord / Telegram |
| Captcha | Java ellenőriz | Google |
| Szórólap keresés | Postgres | Synckor a boltok |
| Kártya, naptár, tudástár | Postgres / uploads | Nem |
| Linktár | Frontend konstans | Nem |
| Bevásárlólista | localStorage | Nem |

---

## 12. STAR — három történet

**Ügyfél + iteráció.** Ötletláda / saját használat → ponttervező, terjedelem, kártyák. „Nem specből indultam, hanem abból, hogy zh előtt ki kell számolni, mi kell még.”

**Adat / integráció.** Kilenc bolt, más formátum. „A usernek terméklista kell, nem nyers PDF.”

**Bevezetés.** Két domain, három backend, Docker, Actions, healthcheck. „Akkor kész, ha HTTPS-en válaszol, nem ha nálam lefut.”

**Ha QMS / implementáció:** minőség = ismételhető folyamat + adat. Nálad: PENDING jegyzet, szórólap-szinkron, Decimal kerekítés. Gyári ISO-t ne blöffölj.

**Ha „miért Python?”:** a szabályteszt HTTP nélkül; a böngésző egy origin marad a prefix miatt.

**Ha Palantir / AWS / K8s:** „Nincs. Compose + Caddy + Hetzner van. Foundry-t a csapattal veszem fel.”

---

## 13. Számok, ha kérdezik

Access 15 perc `/api`. Refresh 7 nap `/api/auth`. Verify 24 óra. Reset 1 óra.  
Feltöltés 10 MB. Kártya 40 pakli / 200 / again 10 perc / good ×2 max 60 nap.  
Pont: 12 rész, 2 tizedes, küszöb 50/65/75/85. Terjedelem 200k karakter, 200 wpm.  
Flyer 6:30, 9 bolt, ~48–80 oldal/PDF, ár nincs.  
Java 21, Boot 4, React 19, FastAPI, Postgres 15, Python 3.11+.

---

## 14. Fogalom, egy mondatban

**API** — program kérdez programot. Mondd, saját-e vagy idegen.  
**Reverse proxy** — a Caddy eldönti, melyik konténer kapja az URL-t.  
**HttpOnly** — JS nem olvassa a sütit.  
**OCR** — képből betű (Coop). A PDF layout **nem** OCR.  
**Decimal** — tizedes, nem float.  
**Magic byte** — a fájl eleje mondja a típust, nem a `.pdf`.  
**Strategy** — boltanként más extractor, ugyanaz a sync keret.

---

## 15. Gyakorlás

1. Rajzold: böngésző → Caddy → három API → Postgres.  
2. Mondd el a kalkulátort: átlag nálad, derivált Newton.  
3. Mondd el a ponttervezőt: null vs 0, ceiling, miért nem Java.  
4. Mondd el egy boltot mélyen (Aldi **vagy** Lidl **vagy** Coop) — ne mind a kilencet végig.  
5. 30 mp pitch, óra nélkül.

Ha egy szakszónál elakadsz, a mondat a lényeg, nem a szó.
