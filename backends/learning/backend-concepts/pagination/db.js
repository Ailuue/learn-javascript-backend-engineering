// SQLite connection + schema for the pagination demo. File-backed (articles.db)
// so the seed persists between `seed.js` and `main.js` runs.

const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "articles.db"));
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    body         TEXT NOT NULL,
    author       TEXT NOT NULL,
    published_at TEXT NOT NULL,
    view_count   INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    author     TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = { db };
