/**
 * Redis client (ioredis) and key/serialisation helpers shared across scripts.
 *
 * Key naming convention:
 *   product:{id}        — a single cached product (JSON string)
 *   lock:product:{id}   — distributed lock for stampede protection
 *   pending:writes      — Redis list used by write-behind to queue DB flushes
 *
 * ioredis is the standard 2026 Node Redis client (already used by the backends).
 * Every call is async and returns a promise.
 */

const Redis = require("ioredis");

const client = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
});

// Short TTLs keep demo output readable; production values are minutes to hours.
const PRODUCT_TTL = 10; // seconds — single product entry
const LOCK_TTL = 2; // seconds — stampede lock hold time

const productKey = (id) => `product:${id}`;
const lockKey = (id) => `lock:product:${id}`;
const pendingWritesKey = () => "pending:writes";

// Product rows carry price as a string already, so JSON round-trips cleanly.
const serialise = (product) =>
  JSON.stringify({ id: product.id, name: product.name, price: product.price, stock: product.stock });
const deserialise = (raw) => JSON.parse(raw);

// SET key value NX EX ttl — returns true if the key was set (lock acquired).
async function setNx(key, value, ttl) {
  const result = await client.set(key, value, "EX", ttl, "NX");
  return result === "OK";
}

async function printCacheState(label, ...keys) {
  if (!keys.length) return;
  console.log(`\n  [${label}]`);
  for (const key of keys) {
    const raw = await client.get(key);
    if (raw === null) {
      console.log(`    ${JSON.stringify(key).padEnd(35)}  MISS`);
    } else {
      const remaining = await client.ttl(key);
      const ttlStr = remaining >= 0 ? `TTL=${remaining}s` : "no TTL";
      const short = raw.length < 80 ? raw : `${raw.slice(0, 77)}...`;
      console.log(`    ${JSON.stringify(key).padEnd(35)}  HIT  (${ttlStr})  ${short}`);
    }
  }
}

module.exports = {
  client,
  PRODUCT_TTL,
  LOCK_TTL,
  productKey,
  lockKey,
  pendingWritesKey,
  serialise,
  deserialise,
  setNx,
  printCacheState,
};
