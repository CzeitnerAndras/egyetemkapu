<?php

declare(strict_types=1);

final class DuplicateSku extends RuntimeException
{
}

/**
 * Two tables: a product, and every price that product has had.
 * The latest price is a query, not a column on the product.
 */
final class Catalog
{
    public function __construct(private PDO $pdo)
    {
    }

    public static function connect(string $dsn, ?string $user = null, ?string $password = null): self
    {
        $pdo = new PDO($dsn, $user ?: null, $password ?: null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        return new self($pdo);
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    public function migrate(): void
    {
        if ($this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $this->pdo->exec('PRAGMA foreign_keys = ON');
            $this->pdo->exec(
                'CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sku TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL
                )'
            );
            $this->pdo->exec(
                'CREATE TABLE IF NOT EXISTS prices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id INTEGER NOT NULL REFERENCES products(id),
                    amount_huf INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )'
            );
            return;
        }

        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS products (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                sku VARCHAR(32) NOT NULL,
                name VARCHAR(200) NOT NULL,
                UNIQUE KEY uq_products_sku (sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS prices (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                amount_huf INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_prices_product FOREIGN KEY (product_id) REFERENCES products (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
    }

    public function addProduct(string $sku, string $name): array
    {
        try {
            $statement = $this->pdo->prepare('INSERT INTO products (sku, name) VALUES (?, ?)');
            $statement->execute([$sku, $name]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') {
                throw new DuplicateSku();
            }
            throw $error;
        }
        $product = $this->findProduct((int) $this->pdo->lastInsertId());
        if ($product === null) {
            throw new RuntimeException('A beszúrt termék nem olvasható vissza.');
        }
        return $product;
    }

    public function addPrice(int $productId, int $amountHuf): ?array
    {
        if ($this->findProduct($productId) === null) {
            return null;
        }
        $statement = $this->pdo->prepare('INSERT INTO prices (product_id, amount_huf) VALUES (?, ?)');
        $statement->execute([$productId, $amountHuf]);
        return [
            'id' => (int) $this->pdo->lastInsertId(),
            'productId' => $productId,
            'amountHuf' => $amountHuf,
        ];
    }

    public function findProduct(int $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT p.id, p.sku, p.name,
                    (SELECT amount_huf FROM prices WHERE product_id = p.id ORDER BY id DESC LIMIT 1) AS amount_huf
             FROM products p
             WHERE p.id = ?'
        );
        $statement->execute([$id]);
        $row = $statement->fetch();
        return $row === false ? null : $this->product($row);
    }

    public function listProducts(): array
    {
        $rows = $this->pdo->query(
            'SELECT p.id, p.sku, p.name,
                    (SELECT amount_huf FROM prices WHERE product_id = p.id ORDER BY id DESC LIMIT 1) AS amount_huf
             FROM products p
             ORDER BY p.id'
        )->fetchAll();
        return array_map($this->product(...), $rows);
    }

    private function product(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'sku' => (string) $row['sku'],
            'name' => (string) $row['name'],
            'amountHuf' => $row['amount_huf'] === null ? null : (int) $row['amount_huf'],
        ];
    }
}
