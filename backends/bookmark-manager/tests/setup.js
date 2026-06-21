// Shared test setup — required at the top of every bookmark-manager test file.
// It MUST configure the environment before anything
// imports the Prisma client, swaps in a fake Redis, and stubs the background
// queue so no broker is needed.

const path = require("path");

const DB_PATH = path.resolve(__dirname, "..", "prisma", "test.db");
process.env.DATABASE_URL = `file:${DB_PATH}`;
process.env.SECRET_KEY = process.env.SECRET_KEY || "test-secret-key-not-for-production";
process.env.ACCESS_TOKEN_EXPIRE_MINUTES = "30";

const RedisMock = require("ioredis-mock");
const request = require("supertest");

const { setRedis, getRedis } = require("../app/redis_client");
setRedis(new RedisMock());

// Stub the enqueue side of the metadata task so tests never touch BullMQ/Redis.
// We're not testing the worker here, only that the task gets enqueued.
const tasks = require("../app/tasks");
tasks.fetchBookmarkMetadata.delay = async () => {};

const app = require("../app/main");
const prisma = require("../app/database");
const { createAccessToken, hashPassword } = require("../app/security");

const api = () => request(app);

async function createUser({ email, username, password }) {
  return prisma.user.create({
    data: { email, username, passwordHash: hashPassword(password) },
  });
}

function authHeadersFor(username) {
  return { Authorization: `Bearer ${createAccessToken(username)}` };
}

// The default test fixtures.
async function defaultUser() {
  const user = await createUser({
    email: "test@example.com",
    username: "testuser",
    password: "testpass123",
  });
  return { user, headers: authHeadersFor(user.username) };
}

async function otherUser() {
  const user = await createUser({
    email: "other@example.com",
    username: "otheruser",
    password: "otherpass123",
  });
  return { user, headers: authHeadersFor(user.username) };
}

async function resetDb() {
  await prisma.bookmark.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

// Clear the fake Redis between tests so blocklist/click state doesn't leak.
beforeEach(async () => {
  await resetDb();
  await getRedis().flushall();
});

afterAll(async () => {
  await prisma.$disconnect();
  await getRedis().quit();
});

module.exports = {
  api,
  prisma,
  getRedis,
  createUser,
  authHeadersFor,
  defaultUser,
  otherUser,
};
