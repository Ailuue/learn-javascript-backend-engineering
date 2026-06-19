// A single shared Prisma client. Every handler shares this one connection pool,
// which is the idiomatic Prisma pattern.

const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();

module.exports = prisma;
