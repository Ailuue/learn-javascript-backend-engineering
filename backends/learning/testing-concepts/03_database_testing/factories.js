/**
 * Factory helpers — the JS replacement for pytest factory fixtures.
 *
 * Each returns a callable bound to a db handle that creates a row with sensible
 * defaults, overridable per call. Plain functions, no fixture injection magic.
 */

const repository = require("./repository");

function makeUserFactory(db) {
  return ({ username = "alice", email } = {}) =>
    repository.createUser(db, username, email ?? `${username}@example.com`);
}

function makePostFactory(db) {
  return (user, { title = "Test Post", body = "Body content.", published = false } = {}) =>
    repository.createPost(db, user, title, body, published);
}

module.exports = { makeUserFactory, makePostFactory };
