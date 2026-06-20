/**
 * Same data as section 02, with a batch-aware query function added.
 */

const SEED_AUTHORS = [
  { id: "a1", name: "Alice Nguyen", bio: "Distributed systems engineer" },
  { id: "a2", name: "Bob Okafor", bio: "Frontend performance specialist" },
  { id: "a3", name: "Carol Petersen", bio: "Database architect" },
];

const SEED_POSTS = [
  { id: "p1", title: "Intro to CRDT", body: "CRDTs allow...", authorId: "a1" },
  { id: "p2", title: "Raft Consensus", body: "Raft is...", authorId: "a1" },
  { id: "p3", title: "Core Web Vitals", body: "LCP, FID...", authorId: "a2" },
  { id: "p4", title: "CSS Grid Deep Dive", body: "Grid is...", authorId: "a2" },
  { id: "p5", title: "EXPLAIN ANALYZE", body: "Postgres...", authorId: "a3" },
  { id: "p6", title: "Index Selectivity", body: "Selectivity...", authorId: "a3" },
];

let authors = [];
let posts = [];

// Counts BATCH load calls (not individual item lookups).
const BatchCounter = {
  calls: 0,
  reset() {
    this.calls = 0;
  },
};

function reset() {
  authors = SEED_AUTHORS.map((r) => ({ ...r }));
  posts = SEED_POSTS.map((r) => ({ ...r }));
  BatchCounter.reset();
}

// Batch load — returns one item per input id (null if not found), in input order.
function getAuthorsByIds(ids) {
  BatchCounter.calls += 1;
  const index = new Map(authors.map((a) => [a.id, a]));
  return ids.map((id) => index.get(id) ?? null);
}

reset();

module.exports = {
  reset,
  getAuthorsByIds,
  BatchCounter,
  get authors() {
    return authors;
  },
  get posts() {
    return posts;
  },
};
