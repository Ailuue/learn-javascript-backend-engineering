// In-memory SQLite (better-sqlite3) + schema. In-memory keeps the suite
// self-contained (no Postgres). Tests isolate themselves with SAVEPOINT /
// ROLLBACK in beforeEach/afterEach — a transaction-rollback strategy on one
// shared connection.

const Database = require("better-sqlite3");

const db = new Database(":memory:");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email    TEXT NOT NULL UNIQUE
  );
  CREATE TABLE posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    published  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = { db };
