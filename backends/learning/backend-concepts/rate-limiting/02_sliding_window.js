/**
 * Sliding Window Rate Limiting
 * =============================
 * The window moves with time: at each request, count requests in the last N
 * seconds. A Redis sorted set stores one entry per request (score = timestamp).
 *
 *   ZREMRANGEBYSCORE key 0 (now-window)   ← evict expired entries
 *   ZADD key now member                   ← record this request
 *   ZCARD key                             ← count requests in window
 *   EXPIRE key window
 *
 * All four run atomically in one Lua script. Unlike fixed window, a boundary
 * burst IS caught because those requests stay inside the rolling window.
 * Trade-off: one entry per request (vs one integer for fixed window).
 *
 * Run:  docker compose up -d (Redis)  →  node 02_sliding_window.js
 */

const crypto = require("crypto");
const redisRl = require("./redis_rl");

const LIMIT = 5;
const WINDOW = 10; // seconds

const LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('EXPIRE', key, window)
return count
`;

async function isAllowed(identifier, now) {
  const key = `rl:sliding:${identifier}`;
  const member = `${now}:${crypto.randomUUID()}`;
  const count = await redisRl.client.eval(LUA, 1, key, now, WINDOW, member);
  return { allowed: count <= LIMIT, count };
}

async function makeRequests(identifier, timestamps, label) {
  console.log(`\n  ${label}`);
  let i = 0;
  for (const ts of timestamps) {
    i += 1;
    const { allowed, count } = await isAllowed(identifier, ts);
    console.log(`    req ${String(i).padStart(2)}  t=${ts.toFixed(1)}  [${allowed ? "ALLOW" : "DENY "}]  window count: ${count}/${LIMIT}`);
  }
}

async function main() {
  await redisRl.flush();
  console.log("=== Sliding Window Rate Limiting ===");
  console.log(`    limit=${LIMIT} requests per ${WINDOW}s rolling window`);
  const base = 1000.0;

  console.log("\n--- Normal traffic: 5 requests spread over the window ---");
  await redisRl.flush();
  await makeRequests("user:1", Array.from({ length: 5 }, (_, i) => base + i * 2), "5 requests, 2s apart");

  console.log("\n--- 7 rapid requests: first 5 allowed, then 2 denied ---");
  await redisRl.flush();
  await makeRequests("user:1", Array.from({ length: 7 }, (_, i) => base + i * 0.1), "7 requests within 1 second");

  console.log("\n--- Boundary burst: 5 near window end, 5 at start of next ---");
  await redisRl.flush();
  const burst = [
    ...Array.from({ length: 5 }, (_, i) => base + 9 + i * 0.1),
    ...Array.from({ length: 5 }, (_, i) => base + 11 + i * 0.1),
  ];
  await makeRequests("user:1", burst, "5 at t≈9s, 5 at t≈11s (2s gap)");
  console.log("    → Sliding window catches the burst fixed window missed.");

  await redisRl.client.quit();
}

main().catch((err) => {
  console.error("ERROR (is Redis running?):", err.message);
  process.exit(1);
});
