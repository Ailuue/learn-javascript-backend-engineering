// Posts API — the app under test (Express + better-sqlite3 + Zod).
//
// Auth is a simplified X-User-Id header (a real app would use JWT — see jwt-rbac).
// The pattern being tested — auth middleware + ownership checks + Zod validation —
// is identical regardless of the mechanism.
//
// Status-code convention: a missing/unknown user is 401, and 422 is reserved for
// body validation failures.

const express = require("express");
const { db } = require("./db");
const { PostCreate, PostUpdate } = require("./schemas");

const app = express();
app.use(express.json());

const toDto = (p) => ({
  id: p.id,
  user_id: p.user_id,
  title: p.title,
  body: p.body,
  published: Boolean(p.published),
  created_at: p.created_at,
});

// Auth middleware — resolve X-User-Id to a user, or 401.
function authenticate(req, res, next) {
  const header = req.headers["x-user-id"];
  if (header === undefined) return res.status(401).json({ detail: "Missing X-User-Id header." });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(header));
  if (!user) return res.status(401).json({ detail: "Unknown user." });
  req.user = user;
  return next();
}

// Validate the body against a Zod schema, or 422.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) return res.status(422).json({ detail: result.error.issues });
  req.data = result.data;
  return next();
};

// GET /posts — published posts, optional author filter, newest first.
app.get("/posts", (req, res) => {
  const authorId = req.query.author_id;
  let rows;
  if (authorId !== undefined) {
    rows = db
      .prepare("SELECT * FROM posts WHERE published = 1 AND user_id = ? ORDER BY created_at DESC, id DESC")
      .all(Number(authorId));
  } else {
    rows = db.prepare("SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC, id DESC").all();
  }
  res.json(rows.map(toDto));
});

// GET /posts/:id
app.get("/posts/:id", (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(Number(req.params.id));
  if (!post) return res.status(404).json({ detail: "Post not found." });
  return res.json(toDto(post));
});

// POST /posts
app.post("/posts", authenticate, validate(PostCreate), (req, res) => {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO posts (user_id, title, body, published) VALUES (?, ?, ?, 0)")
    .run(req.user.id, req.data.title, req.data.body);
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(lastInsertRowid);
  res.status(201).json(toDto(post));
});

// PATCH /posts/:id — owner-only partial update.
app.patch("/posts/:id", authenticate, validate(PostUpdate), (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(Number(req.params.id));
  if (!post) return res.status(404).json({ detail: "Post not found." });
  if (post.user_id !== req.user.id) return res.status(403).json({ detail: "Not your post." });

  // Apply only fields that were provided and non-null.
  const fields = {};
  if (req.data.title != null) fields.title = req.data.title;
  if (req.data.body != null) fields.body = req.data.body;
  if (req.data.published != null) fields.published = req.data.published ? 1 : 0;

  const cols = Object.keys(fields);
  if (cols.length) {
    db.prepare(`UPDATE posts SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`).run(
      ...cols.map((c) => fields[c]),
      post.id
    );
  }
  return res.json(toDto(db.prepare("SELECT * FROM posts WHERE id = ?").get(post.id)));
});

// DELETE /posts/:id — owner-only.
app.delete("/posts/:id", authenticate, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(Number(req.params.id));
  if (!post) return res.status(404).json({ detail: "Post not found." });
  if (post.user_id !== req.user.id) return res.status(403).json({ detail: "Not your post." });
  db.prepare("DELETE FROM posts WHERE id = ?").run(post.id);
  return res.status(204).end();
});

module.exports = { app };
