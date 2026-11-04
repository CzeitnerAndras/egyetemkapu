<?php

declare(strict_types=1);

require __DIR__ . '/../src/app.php';

[$status, $body] = handle_request(
    catalog_from_env(dirname(__DIR__)),
    $_SERVER['REQUEST_METHOD'] ?? 'GET',
    parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/',
    read_json_body()
);

http_response_code($status);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($body, JSON_UNESCAPED_UNICODE);
