/**
 * In-memory data store for section 02.
 *
 * Deliberately separate from schema.js so the N+1 counter is easy to observe.
 * Field names are camelCase (authorId) to match the GraphQL SDL.
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

// Tracks "DB" calls so tests can assert N+1 behaviour.
const QueryCounter = {
  calls: 0,
  reset() {
    this.calls = 0;
  },
  record() {
    this.calls += 1;
  },
};

function reset() {
  authors = SEED_AUTHORS.map((r) => ({ ...r }));
  posts = SEED_POSTS.map((r) => ({ ...r }));
  QueryCounter.reset();
}

function getAuthor(authorId) {
  QueryCounter.record(`getAuthor(${authorId})`);
  return authors.find((a) => a.id === authorId) ?? null;
}

function getPostsByAuthor(authorId) {
  QueryCounter.record(`getPostsByAuthor(${authorId})`);
  return posts.filter((p) => p.authorId === authorId);
}

reset();

module.exports = {
  reset,
  getAuthor,
  getPostsByAuthor,
  QueryCounter,
  get authors() {
    return authors;
  },
  get posts() {
    return posts;
  },
};
