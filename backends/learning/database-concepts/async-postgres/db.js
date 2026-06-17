// Shared async Postgres layer (node-postgres `Pool`).
//
// Node is async by default, so `pg` queries never block the event loop. A `Pool`
// keeps connections open and hands them out; `pool.query()` grabs+releases one
// automatically, while `pool.connect()` checks one out that YOU must release
// (needed for multi-statement transactions).
//
// Pool options:
//   max                     max number of connections in the pool
//   connectionTimeoutMillis how long to wait for a free connection before failing
//   idleTimeoutMillis       close idle connections after N ms
//   maxLifetimeSeconds      retire connections older than N seconds

const { Pool } = require("pg");

const baseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "async_demo",
  user: process.env.DB_USER || process.env.USER || "postgres",
  password: process.env.DB_PASSWORD || "",
};

function makePool(overrides = {}) {
  return new Pool({ ...baseConfig, max: 5, idleTimeoutMillis: 10_000, ...overrides });
}

// Default pool for scripts that don't need custom settings.
const pool = makePool();

async function resetSchema(p = pool) {
  await p.query(`
    DROP TABLE IF EXISTS products;
    CREATE TABLE products (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL, stock INT NOT NULL DEFAULT 0
    );
  `);
}

async function seed(p = pool) {
  const rows = [
    ["Wireless Keyboard", "79.99", 42],
    ["USB-C Hub", "49.99", 130],
    ["Monitor Stand", "34.99", 17],
  ];
  const inserted = [];
  for (const [name, price, stock] of rows) {
    // eslint-disable-next-line no-await-in-loop
    const { rows: r } = await p.query("INSERT INTO products (name, price, stock) VALUES ($1,$2,$3) RETURNING *", [name, price, stock]);
    inserted.push(r[0]);
  }
  return inserted;
}

// pg exposes live counters on the pool.
function printPoolStatus(p, label = "Pool status") {
  console.log(`\n  [${label}]`);
  console.log(`    total connections: ${p.totalCount}`);
  console.log(`    idle:              ${p.idleCount}`);
  console.log(`    waiting (queued):  ${p.waitingCount}`);
}

module.exports = { makePool, pool, resetSchema, seed, printPoolStatus };
