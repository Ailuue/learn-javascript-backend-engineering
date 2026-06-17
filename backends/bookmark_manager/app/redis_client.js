// Lazy Redis client used by the JWT blocklist and the click counter.
//
// A module-level singleton with getRedis() / setRedis() lets tests swap in
// ioredis-mock without monkey-patching every import site.

const Redis = require("ioredis");

const { getSettings } = require("./config");

let client = null;

function getRedis() {
  if (client === null) {
    const settings = getSettings();
    client = new Redis(settings.redisUrl);
  }
  return client;
}

// For testing: inject a fake Redis client.
function setRedis(injected) {
  client = injected;
}

module.exports = { getRedis, setRedis };
