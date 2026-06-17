// Application settings, read from the environment with defaults.

function getSettings() {
  return {
    databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
    baseUrl: process.env.BASE_URL || "http://localhost:8000",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",
    cacheTtl: Number(process.env.CACHE_TTL || 300),
    jwtSecret: process.env.JWT_SECRET || "change-me-to-a-long-random-string",
    jwtAlgorithm: process.env.JWT_ALGORITHM || "HS256",
    jwtExpiryMinutes: Number(process.env.JWT_EXPIRY_MINUTES || 30),
  };
}

module.exports = { getSettings };
