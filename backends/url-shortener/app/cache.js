// Redis cache helpers for the hot redirect path. `init()` is called once at
// startup; the rest assume a connection exists.

const Redis = require("ioredis");

const { getSettings } = require("./config");

const KEY_PREFIX = "url:";

let redis = null;

async function init() {
  redis = new Redis(getSettings().redisUrl);
}

async function close() {
  if (redis) await redis.quit();
}

function key(shortCode) {
  return `${KEY_PREFIX}${shortCode}`;
}

async function get(shortCode) {
  return redis.get(key(shortCode));
}

async function set(shortCode, originalUrl) {
  await redis.set(key(shortCode), originalUrl, "EX", getSettings().cacheTtl);
}

async function invalidate(shortCode) {
  await redis.del(key(shortCode));
}

async function stats() {
  const info = await redis.info("stats");
  const read = (field) => {
    const match = new RegExp(`${field}:(\\d+)`).exec(info);
    return match ? Number(match[1]) : null;
  };
  return {
    keyspace_hits: read("keyspace_hits"),
    keyspace_misses: read("keyspace_misses"),
  };
}

module.exports = { init, close, get, set, invalidate, stats };
