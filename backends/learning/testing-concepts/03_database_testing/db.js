/**
 * Schema + connection for section 03.
 *
 * Uses better-sqlite3 — the popular *synchronous* SQLite driver for Node. An
 * in-memory database (":memory:") needs no file and no cleanup, so the whole
 * section runs standalone with no Docker (the same role SQLite plays in the
 * Python version).
 */

const Database = require("better-sqlite3");

function createDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON"); // SQLite doesn't enforce FKs unless asked
  db.exec(`
    CREATE TABLE users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      email      TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      published  INTEGER NOT NULL DEFAULT 0,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

module.exports = { createDb };
