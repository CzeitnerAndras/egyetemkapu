<?php

declare(strict_types=1);

require __DIR__ . '/../src/app.php';

$failed = 0;

function check(bool $condition, string $message): void
{
    global $failed;
    if (!$condition) {
        $failed++;
        fwrite(STDERR, "FAIL {$message}\n");
    }
}

function fresh_catalog(): Catalog
{
    $catalog = Catalog::connect('sqlite:' . tempnam(sys_get_temp_dir(), 'price'));
    $catalog->migrate();
    return $catalog;
}

$catalog = fresh_catalog();
$tea = $catalog->addProduct("a' OR '1'='1", 'Tea');
check($tea['sku'] === "a' OR '1'='1", 'a quote in the sku is stored as text');
check(count($catalog->listProducts()) === 1, 'the quote does not change the query');

$again = handle_request($catalog, 'POST', '/products', ['sku' => "a' OR '1'='1", 'name' => 'Másik']);
check($again[0] === 409, 'the same sku is rejected');

$missing = $catalog->addPrice(999, 100);
check($missing === null, 'a price needs a real product');

$fkRejected = false;
try {
    $catalog->pdo()->prepare('INSERT INTO prices (product_id, amount_huf) VALUES (?, ?)')->execute([999, 100]);
} catch (PDOException) {
    $fkRejected = true;
}
check($fkRejected, 'the foreign key rejects a price without a product');

$first = $catalog->addPrice($tea['id'], 499);
$second = $catalog->addPrice($tea['id'], 450);
$stored = $catalog->findProduct($tea['id']);
check($first !== null && $second !== null && $stored['amountHuf'] === 450, 'the latest price is the one that counts');

$empty = handle_request($catalog, 'POST', '/products', ['sku' => '', 'name' => 'Tea']);
check($empty[0] === 400, 'an empty sku is rejected');

$negative = handle_request($catalog, 'POST', '/products/' . $tea['id'] . '/prices', ['amountHuf' => -1]);
check($negative[0] === 400, 'a negative price is rejected');

$created = handle_request(fresh_catalog(), 'POST', '/products', ['sku' => 'TEA-1', 'name' => 'Tea']);
check($created[0] === 201 && $created[1]['amountHuf'] === null, 'a new product has no price yet');

if ($failed > 0) {
    fwrite(STDERR, "{$failed} failed\n");
    exit(1);
}

echo "ok\n";
