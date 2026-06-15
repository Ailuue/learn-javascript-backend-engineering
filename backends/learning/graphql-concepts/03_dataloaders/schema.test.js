/**
 * Tests for 03_dataloaders.
 *
 * Key goal: prove a DataLoader reduces N+1 to a single batch call. Compare the
 * call counts against section 02. These use the async `graphql()` because
 * DataLoader batching depends on the event loop.
 */

const { graphql } = require("graphql");
const { schema, makeContext } = require("./schema");
const db = require("./data");
const { makeAuthorLoader } = require("./loaders");

const run = (source) =>
  graphql({ schema, source, contextValue: { authorLoader: makeAuthorLoader() } });

beforeEach(() => db.reset());
afterEach(() => db.reset());

// ── Correctness (same results as section 02) ─────────────────────────────────

test("posts with authors returns correct data", async () => {
  const result = await run("{ posts { title author { name } } }");
  expect(result.errors).toBeUndefined();
  expect(result.data.posts).toHaveLength(6);
  expect(result.data.posts[0].author.name).toBe("Alice Nguyen");
  expect(result.data.posts[2].author.name).toBe("Bob Okafor");
});

test("single post author resolves correctly", async () => {
  const result = await run('{ post(id: "p3") { title author { name } } }');
  expect(result.data.post.author.name).toBe("Bob Okafor");
});

// ── N+1 is gone: 6 posts → 1 batch call ─────────────────────────────────────

test("six posts cause only one batch author load", async () => {
  const result = await run("{ posts { title author { name } } }");
  expect(result.errors).toBeUndefined();
  expect(db.BatchCounter.calls).toBe(1);
});

test("posts without author field makes zero batch calls", async () => {
  const result = await run("{ posts { title } }");
  expect(result.errors).toBeUndefined();
  expect(db.BatchCounter.calls).toBe(0);
});

test("two posts with the same author still only one batch call", async () => {
  // p1 and p2 both have authorId "a1" — the loader caches, batch fires once.
  const result = await run("{ posts { author { name } } }");
  expect(result.errors).toBeUndefined();
  expect(db.BatchCounter.calls).toBe(1);
});

test("single post costs one batch call", async () => {
  await run('{ post(id: "p1") { author { name } } }');
  expect(db.BatchCounter.calls).toBe(1);
});

// ── Each request gets a fresh loader (no cross-request cache) ─────────────────

test("two separate requests each make one batch call", async () => {
  await graphql({ schema, source: "{ posts { author { name } } }", contextValue: makeContext() });
  expect(db.BatchCounter.calls).toBe(1);

  await graphql({ schema, source: "{ posts { author { name } } }", contextValue: makeContext() });
  expect(db.BatchCounter.calls).toBe(2);
});
