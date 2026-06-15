/**
 * In-memory todo store for section 05.
 */

const SEED = [
  { id: "1", title: "Learn GraphQL schema basics", done: true, priority: 1 },
  { id: "2", title: "Understand relationships", done: true, priority: 1 },
  { id: "3", title: "Implement DataLoaders", done: false, priority: 2 },
  { id: "4", title: "Practice mutations", done: false, priority: 1 },
];

const state = { items: [], nextId: 5 };

function reset() {
  state.items = SEED.map((r) => ({ ...r }));
  state.nextId = 5;
}

reset();

module.exports = { state, reset };
