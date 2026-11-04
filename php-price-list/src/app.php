<?php

declare(strict_types=1);

require_once __DIR__ . '/Catalog.php';

function catalog_from_env(string $root): Catalog
{
    $dsn = getenv('DATABASE_DSN');
    if ($dsn === false || $dsn === '') {
        $directory = $root . '/data';
        if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
            throw new RuntimeException('A data mappa nem hozható létre.');
        }
        $dsn = 'sqlite:' . $directory . '/catalog.sqlite';
    }
    $user = getenv('DATABASE_USER');
    $password = getenv('DATABASE_PASSWORD');
    $catalog = Catalog::connect(
        $dsn,
        $user === false || $user === '' ? null : $user,
        $password === false || $password === '' ? null : $password
    );
    $catalog->migrate();
    return $catalog;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * @return array{0:int,1:array<string,mixed>}
 */
function handle_request(Catalog $catalog, string $method, string $path, array $json): array
{
    $path = rtrim($path, '/') ?: '/';

    if ($method === 'GET' && $path === '/health') {
        return [200, ['ok' => true]];
    }
    if ($method === 'GET' && $path === '/products') {
        return [200, ['products' => $catalog->listProducts()]];
    }
    if ($method === 'POST' && $path === '/products') {
        $sku = trim((string) ($json['sku'] ?? ''));
        $name = trim((string) ($json['name'] ?? ''));
        if ($sku === '' || $name === '' || strlen($sku) > 32 || strlen($name) > 200) {
            return [400, ['error' => 'A cikkszám és a név kötelező.']];
        }
        try {
            return [201, $catalog->addProduct($sku, $name)];
        } catch (DuplicateSku) {
            return [409, ['error' => 'Ez a cikkszám már létezik.']];
        }
    }
    if (preg_match('#^/products/(\d+)$#', $path, $match) === 1 && $method === 'GET') {
        $product = $catalog->findProduct((int) $match[1]);
        return $product === null
            ? [404, ['error' => 'Nincs ilyen termék.']]
            : [200, $product];
    }
    if (preg_match('#^/products/(\d+)/prices$#', $path, $match) === 1 && $method === 'POST') {
        if (!array_key_exists('amountHuf', $json) || !is_int($json['amountHuf']) || $json['amountHuf'] < 0) {
            return [400, ['error' => 'Az ár nemnegatív egész forint.']];
        }
        $price = $catalog->addPrice((int) $match[1], $json['amountHuf']);
        return $price === null
            ? [404, ['error' => 'Nincs ilyen termék.']]
            : [201, $price];
    }
    return [404, ['error' => 'Nincs ilyen útvonal.']];
}
