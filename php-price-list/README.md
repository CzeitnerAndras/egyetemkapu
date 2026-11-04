# Árlista

Egy bolt két táblája: `products` és `prices`. Egy terméknek sok ára lehet. A termék sorában nincs ár; a legutóbbi ár egy lekérdezés.

Ez nem egy webshop. Azért árlista, mert a Shoprenter is terméket és árat tárol, és ezen a két táblán látszik a PHP, a MySQL és a prepared statement.

## Mi minek felel meg

A böngésző a `public/index.php` fájlt éri el. Ez a belépési pont: beolvassa a kérést, meghívja a `handle_request` függvényt, és JSON-t ír vissza. Java-ban ez a controller lenne.

A `src/app.php` dönti el, melyik útvonal mit csinál. A `src/Catalog.php` beszél az adatbázissal. A `?` a prepared statement helye: az adat sosem kerül bele az SQL szövegébe.

Ha nincs `DATABASE_DSN`, a szolgáltatás egy SQLite fájlt használ a `data/` mappában. Ugyanaz a PHP kód MySQL-re vált, ha a DSN mysql. A táblát induláskor a `migrate()` hozza létre. Éles rendszerben ez migráció, nem az alkalmazás indulása.

## Útvonalak

- `GET /health`
- `GET /products`
- `POST /products` body: `{"sku":"TEA-1","name":"Tea"}`
- `GET /products/1`
- `POST /products/1/prices` body: `{"amountHuf":499}`

Az ár egész forint. A második áradat felülírja, amit a lista mutat; a régi sor a `prices` táblában megmarad.

## Futtatás

PHP 8.3 kell. Ezen a gépen még nincs telepítve.

```powershell
winget install PHP.PHP.8.3
php -S localhost:8088 -t public
```

A parancsot a `php-price-list` mappából indítsd. Másik ablakban:

```powershell
php tests/catalog_test.php
curl.exe http://localhost:8088/health
curl.exe -H "Content-Type: application/json" -d "{\"sku\":\"TEA-1\",\"name\":\"Tea\"}" http://localhost:8088/products
curl.exe -H "Content-Type: application/json" -d "{\"amountHuf\":499}" http://localhost:8088/products/1/prices
```

MySQL, ha van Docker:

```powershell
docker compose up --build
```

A szolgáltatás a 8088-as porton hallgat, a MySQL a 3306-on. A jelszó a compose fájlban `catalog`, csak helyi gyakorlásra.
