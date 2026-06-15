/**
 * Async data access layer.
 *
 * Every operation is awaited — the interface mirrors the sync repository in
 * 03_database_testing/ so the two can be compared directly.
 */

async function createUser(db, username, email) {
  const info = await db.run("INSERT INTO users (username, email) VALUES (?, ?)", username, email);
  return getUserById(db, info.lastInsertRowid);
}

async function getUserById(db, id) {
  return db.get("SELECT * FROM users WHERE id = ?", id);
}

async function getUserByEmail(db, email) {
  return db.get("SELECT * FROM users WHERE email = ?", email);
}

async function listUsers(db) {
  return db.all("SELECT * FROM users ORDER BY id");
}

async function createPost(db, user, title, body, published = false) {
  const info = await db.run(
    "INSERT INTO posts (user_id, title, body, published) VALUES (?, ?, ?, ?)",
    user.id,
    title,
    body,
    published ? 1 : 0
  );
  return db.get("SELECT * FROM posts WHERE id = ?", info.lastInsertRowid);
}

async function getPublishedPosts(db) {
  return db.all("SELECT * FROM posts WHERE published = 1 ORDER BY id");
}

async function getPostsByUser(db, user) {
  return db.all("SELECT * FROM posts WHERE user_id = ? ORDER BY id", user.id);
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  listUsers,
  createPost,
  getPublishedPosts,
  getPostsByUser,
};
