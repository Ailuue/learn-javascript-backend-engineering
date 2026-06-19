// Application settings, read once from the environment with sensible defaults.

function getSettings() {
  return {
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@localhost:5432/bookmark_manager",
    secretKey: process.env.SECRET_KEY || "change-me-in-production",
    algorithm: process.env.ALGORITHM || "HS256",
    accessTokenExpireMinutes: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 30),
    logLevel: process.env.LOG_LEVEL || "INFO",
    environment: process.env.ENVIRONMENT || "development",

    redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",
    ratelimitStorageUri: process.env.RATELIMIT_STORAGE_URI || "redis://localhost:6379/0",
    brokerUrl: process.env.BROKER_URL || "redis://localhost:6379/1",
  };
}

module.exports = { getSettings };
