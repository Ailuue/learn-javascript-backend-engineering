// A single shared Prisma client — the JS analog of the SQLModel `engine` +
// `get_session()` in database.py. Where FastAPI injected a per-request Session,
// every handler here shares this one connection pool, which is the idiomatic
// Prisma pattern.

const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();

module.exports = prisma;
