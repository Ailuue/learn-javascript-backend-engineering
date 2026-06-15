// Shared ioredis client + helpers for the rate-limiting demos.
//
// Key naming convention:
//   rl:fixed:{id}:{windowTs}     — fixed window counter
//   rl:sliding:{id}              — sorted set of request timestamps
//   rl:bucket:{id}:tokens / :last — token bucket level + last refill time

const Redis = require("ioredis");

const client = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
});

// Wipe rate-limit keys. Only used at the top of each demo.
async function flush() {
  const keys = await client.keys("rl:*");
  if (keys.length) await client.del(...keys);
}

module.exports = { client, flush };
