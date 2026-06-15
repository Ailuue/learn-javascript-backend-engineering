/**
 * Pagination demo — two strategies side by side (Express + better-sqlite3).
 *
 *   GET /articles/offset?page=1&limit=10
 *   GET /articles/cursor?cursor=<token>&limit=10
 *
 * Run:  node seed.js  (once)  →  node main.js
 */

const express = require("express");
const { db } = require("./db");

const app = express();

// ── Cursor helpers ──────────────────────────────────────────────────────────
// A cursor is an opaque token encoding the position (here, the last item's id).
// We base64 a small JSON payload so it's opaque and extensible (e.g. add a
// secondary sort key later) without changing the API shape.
const encodeCursor = (id) => Buffer.from(JSON.stringify({ id })).toString("base64url");
function decodeCursor(token) {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")).id;
  } catch {
    return null;
  }
}

const toDto = (a) => ({ id: a.id, title: a.title, author: a.author, published_at: a.published_at, view_count: a.view_count });

// ── Offset pagination ───────────────────────────────────────────────────────
// Skip (page-1)*limit rows, take limit. Simple + random access, but pages shift
// on inserts/deletes and OFFSET gets slower as it grows (the DB scans + discards).
app.get("/articles/offset", (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  const total = db.prepare("SELECT COUNT(*) AS c FROM articles").get().c;
  const rows = db
    .prepare("SELECT * FROM articles ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?")
    .all(limit, (page - 1) * limit);
  const totalPages = Math.ceil(total / limit);

  res.json({
    data: rows.map(toDto),
    pagination: {
      page,
      limit,
      total_items: total,
      total_pages: totalPages,
      has_prev: page > 1,
      has_next: page < totalPages,
    },
  });
});

// ── Cursor pagination ───────────────────────────────────────────────────────
// Remember where we left off (last id) and filter WHERE id < :lastId, which uses
// the PK index and stays fast at any depth. Stable under inserts/deletes; no
// random access; no total count (expensive, usually unneeded for infinite scroll).
// The "fetch limit+1" trick cheaply detects whether another page exists.
app.get("/articles/cursor", (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const { cursor } = req.query;

  let rows;
  if (cursor != null) {
    const lastId = decodeCursor(cursor);
    if (lastId == null) return res.status(400).json({ detail: "Invalid cursor token." });
    rows = db.prepare("SELECT * FROM articles WHERE id < ? ORDER BY id DESC LIMIT ?").all(lastId, limit + 1);
  } else {
    rows = db.prepare("SELECT * FROM articles ORDER BY id DESC LIMIT ?").all(limit + 1);
  }

  const hasMore = rows.length > limit;
  const articles = rows.slice(0, limit);
  const nextCursor = hasMore ? encodeCursor(articles[articles.length - 1].id) : null;

  return res.json({
    data: articles.map(toDto),
    pagination: { next_cursor: nextCursor, has_more: hasMore },
  });
});

if (require.main === module) {
  app.listen(8000, () => console.log("pagination demo on http://localhost:8000"));
}

module.exports = { app, encodeCursor, decodeCursor };
