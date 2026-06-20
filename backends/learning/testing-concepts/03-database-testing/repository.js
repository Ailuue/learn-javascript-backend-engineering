/**
 * Data access layer — the code under test.
 *
 * Keeping queries in repository functions (rather than inline in routes) makes
 * them easy to unit-test: pass in a db handle and assert on the result. With
 * better-sqlite3 every call is synchronous — no await.
 */

// ── Users ─────────────────────────────────────────────────────────────────

function createUser(db, username, email) {
  const info = db.prepare("INSERT INTO users (username, email) VALUES (?, ?)").run(username, email);
  return getUserById(db, info.lastInsertRowid);
}

function getUserById(db, id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) ?? null;
}

function getUserByEmail(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) ?? null;
}

function listUsers(db) {
  return db.prepare("SELECT * FROM users ORDER BY id").all();
}

function deleteUser(db, user) {
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
}

// ── Posts ─────────────────────────────────────────────────────────────────

function createPost(db, user, title, body, published = false) {
  const info = db
    .prepare("INSERT INTO posts (user_id, title, body, published) VALUES (?, ?, ?, ?)")
    .run(user.id, title, body, published ? 1 : 0);
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(info.lastInsertRowid);
}

function getPublishedPosts(db) {
  return db.prepare("SELECT * FROM posts WHERE published = 1 ORDER BY id").all();
}

function getPostsByUser(db, user) {
  return db.prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY id").all(user.id);
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  deleteUser,
  createPost,
  getPublishedPosts,
  getPostsByUser,
};
