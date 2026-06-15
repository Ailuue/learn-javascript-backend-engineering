/**
 * 01 · Schema Basics
 * ==================
 *
 * The absolute minimum: one type, a query, and a mutation.
 *
 * Where Strawberry is code-first (types from Python classes), the idiomatic JS
 * approach here is **schema-first**: write the schema in SDL (the GraphQL
 * Schema Definition Language) and attach a parallel `resolvers` map.
 * `makeExecutableSchema` from @graphql-tools/schema stitches them together.
 *
 * Run the tests (schema.test.js) to see queries in action, or start app.js for
 * the interactive playground.
 */

const { makeExecutableSchema } = require("@graphql-tools/schema");

// ── 1. SDL ──────────────────────────────────────────────────────────────────
//
// The `!` means non-nullable. Fields without `!` may return null. `ID` is an
// opaque identifier — identical to String on the wire, but signals intent.
const typeDefs = /* GraphQL */ `
  type Book {
    id: ID!
    title: String!
    author: String!
    year: Int!
    description: String # nullable — no "!"
  }

  input AddBookInput {
    title: String!
    author: String!
    year: Int!
    description: String
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book # returns null if not found
  }

  type Mutation {
    addBook(input: AddBookInput!): Book!
    deleteBook(id: ID!): Boolean!
  }
`;

// ── 2. In-memory store ────────────────────────────────────────────────────────

const SEED = [
  { id: "1", title: "Clean Code", author: "Robert C. Martin", year: 2008, description: null },
  { id: "2", title: "The Pragmatic Programmer", author: "Hunt & Thomas", year: 2019, description: "Updated for a new generation" },
  { id: "3", title: "Design Patterns", author: "Gang of Four", year: 1994, description: "The seminal patterns book" },
];

let books = SEED.map((row) => ({ ...row }));
let nextId = 4;

// Restore seed data — called by the Jest fixture between tests.
function reset() {
  books = SEED.map((row) => ({ ...row }));
  nextId = 4;
}

// ── 3. Resolvers ──────────────────────────────────────────────────────────────
//
// A resolver is `(parent, args, context, info) => value`. Fields without a
// resolver fall back to reading the property of the same name off `parent`
// (so Book.title etc. need no resolver — the default does it).
const resolvers = {
  Query: {
    books: () => books,
    book: (_parent, { id }) => books.find((b) => b.id === id) ?? null,
  },
  Mutation: {
    addBook: (_parent, { input }) => {
      const row = { id: String(nextId), description: null, ...input };
      books.push(row);
      nextId += 1;
      return row;
    },
    deleteBook: (_parent, { id }) => {
      const i = books.findIndex((b) => b.id === id);
      if (i === -1) return false;
      books.splice(i, 1);
      return true;
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = { schema, reset, typeDefs };
