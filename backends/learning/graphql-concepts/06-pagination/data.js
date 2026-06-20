/**
 * 100 posts seeded for pagination demos.
 */

const SEED = Array.from({ length: 100 }, (_, i) => {
  const n = i + 1;
  return {
    id: String(n),
    title: `Post ${String(n).padStart(3, "0")}`,
    body: `Body of post ${n}`,
    tags: n % 2 === 0 ? ["javascript", "graphql"] : ["backend"],
  };
});

let posts = SEED.map((r) => ({ ...r }));

function reset() {
  posts = SEED.map((r) => ({ ...r }));
}

// Cursors are opaque: clients must not parse or construct them. We base64-encode
// a stable "post:<id>" payload.
function encodeCursor(postId) {
  return Buffer.from(`post:${postId}`).toString("base64");
}

function decodeCursor(cursor) {
  const payload = Buffer.from(cursor, "base64").toString("utf8");
  return payload.split(":", 2)[1]; // "post:42" → "42"
}

reset();

module.exports = {
  reset,
  encodeCursor,
  decodeCursor,
  get posts() {
    return posts;
  },
};
