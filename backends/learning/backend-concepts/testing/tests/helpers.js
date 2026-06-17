// Shared test setup: savepoint-based isolation + factory helpers.
//
// installIsolation() wraps each test in a SAVEPOINT and rolls it back afterwards,
// so every test starts from a clean database. Factories return rows with
// sensible, overridable defaults for building test data.

const { db } = require("../app/db");

function installIsolation() {
  beforeEach(() => db.exec("SAVEPOINT test"));
  afterEach(() => db.exec("ROLLBACK TO test"));
}

function makeUser({ username = "alice", email } = {}) {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (username, email) VALUES (?, ?)")
    .run(username, email ?? `${username}@example.com`);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(lastInsertRowid);
}

function makePost(user, { title = "Test Post", body = "Body text.", published = true } = {}) {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO posts (user_id, title, body, published) VALUES (?, ?, ?, ?)")
    .run(user.id, title, body, published ? 1 : 0);
  return db.prepare("SELECT * FROM posts WHERE id = ?").get(lastInsertRowid);
}

module.exports = { db, installIsolation, makeUser, makePost };
