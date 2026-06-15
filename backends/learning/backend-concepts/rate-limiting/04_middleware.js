/**
 * Rate Limiting as Express Middleware
 * ====================================
 * Wraps the sliding-window algorithm in Express middleware so it applies to
 * every request without touching route handlers.
 *
 *   request → middleware (extract identifier, check sliding window)
 *           → allowed?  yes → next()      no → 429 Too Many Requests
 *
 * Per-route limits come from a route→config map with a global default. Every
 * response carries the standard headers: X-RateLimit-Limit / -Remaining / -Reset
 * (and Retry-After on a 429).
 *
 * Run:  docker compose up -d (Redis)  →  node 04_middleware.js
 *   for i in $(seq 1 5); do curl -si localhost:8000/search | head -1; done
 */

const crypto = require("crypto");
const express = require("express");
const redisRl = require("./redis_rl");

const app = express();

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

async function checkRateLimit(identifier, limit, window) {
  const now = Date.now() / 1000;
  const member = `${now}:${crypto.randomUUID()}`;
  const count = await redisRl.client.eval(LUA, 1, `rl:sliding:${identifier}`, now, window, member);
  return { allowed: count <= limit, count };
}

// Per-route limits, with a global default.
const ROUTE_LIMITS = {
  "/search": { limit: 3, window: 30 }, // strict — expensive endpoint
  "/upload": { limit: 5, window: 60 },
};
const DEFAULT_LIMIT = { limit: 10, window: 10 };

app.use(async (req, res, next) => {
  const config = ROUTE_LIMITS[req.path] || DEFAULT_LIMIT;
  const forwarded = req.headers["x-forwarded-for"];
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
  const identifier = `${clientIp}:${req.path}`;

  const { allowed, count } = await checkRateLimit(identifier, config.limit, config.window);
  const remaining = Math.max(0, config.limit - count);
  const resetAt = Math.floor(Date.now() / 1000) + config.window;

  res.set("X-RateLimit-Limit", String(config.limit));
  res.set("X-RateLimit-Remaining", String(allowed ? remaining : 0));
  res.set("X-RateLimit-Reset", String(resetAt));

  if (!allowed) {
    res.set("Retry-After", String(config.window));
    return res.status(429).json({ error: "Too Many Requests", retry_after: config.window });
  }
  return next();
});

app.get("/", (_req, res) => res.json({ message: "Hello! Default limit: 10 req / 10s." }));
app.get("/search", (req, res) => res.json({ results: [], query: req.query.q || "", note: "Strict: 3 req / 30s." }));
app.get("/upload", (_req, res) => res.json({ note: "Moderate: 5 req / 60s." }));

if (require.main === module) {
  app.listen(8000, () => console.log("rate-limited API on http://localhost:8000"));
}

module.exports = { app, checkRateLimit };
