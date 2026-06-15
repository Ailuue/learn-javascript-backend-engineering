// A single shared Prisma client — the JS analog of the async engine + session
// factory in database.py. Every handler shares this one connection pool, which
// is the idiomatic Prisma pattern.

const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();

module.exports = prisma;
