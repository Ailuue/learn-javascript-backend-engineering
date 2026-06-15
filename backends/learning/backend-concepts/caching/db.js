/**
 * Database layer — better-sqlite3 engine, Product table, helpers.
 *
 * Product is the entity we cache throughout all five scripts: something
 * expensive to load but cheap to serve from cache (a product catalogue read
 * thousands of times per minute, updated rarely). SQLite in-memory keeps the
 * demos self-contained — only Redis needs to be running.
 */

const Database = require("better-sqlite3");

const db = new Database(":memory:");

function resetSchema() {
  db.exec(`
    DROP TABLE IF EXISTS products;
    CREATE TABLE products (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      price TEXT NOT NULL,   -- stored as text to preserve exact decimals
      stock INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function seed() {
  const insert = db.prepare("INSERT INTO products (name, price, stock) VALUES (?, ?, ?)");
  const rows = [
    ["Wireless Keyboard", "79.99", 42],
    ["USB-C Hub", "49.99", 130],
    ["Monitor Stand", "34.99", 17],
  ];
  return rows.map(([name, price, stock]) => {
    const info = insert.run(name, price, stock);
    return getProduct(info.lastInsertRowid);
  });
}

function getProduct(id) {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id) ?? null;
}

function allProducts() {
  return db.prepare("SELECT * FROM products ORDER BY id").all();
}

function printProducts(label = "DB state") {
  console.log(`\n  [${label}]`);
  for (const p of allProducts()) {
    console.log(`    Product(id=${p.id}, name=${JSON.stringify(p.name)}, price=${p.price}, stock=${p.stock})`);
  }
}

module.exports = { db, resetSchema, seed, getProduct, allProducts, printProducts };
