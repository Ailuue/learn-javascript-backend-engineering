/**
 * Async schema/connection for section 04.
 *
 * better-sqlite3 itself is synchronous, but real backends usually use an *async*
 * driver (pg, mysql2, libsql). To practise async test patterns we wrap the sync
 * driver in a thin async interface: `run`/`get`/`all`/`exec` return promises.
 * The test code then looks exactly like it would against a real async database —
 * the lesson is the awaiting and async fixtures, not the driver internals.
 */

const Database = require("better-sqlite3");

function createAsyncDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email    TEXT NOT NULL UNIQUE
    );
    CREATE TABLE posts (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      title     TEXT NOT NULL,
      body      TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 0,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Promise-returning wrappers — the async surface the repository/tests use.
  return {
    run: async (sql, ...params) => db.prepare(sql).run(...params),
    get: async (sql, ...params) => db.prepare(sql).get(...params) ?? null,
    all: async (sql, ...params) => db.prepare(sql).all(...params),
    exec: async (sql) => db.exec(sql),
  };
}

module.exports = { createAsyncDb };
