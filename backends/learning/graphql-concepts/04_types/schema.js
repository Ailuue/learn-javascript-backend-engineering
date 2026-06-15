/**
 * 04 · Types — Enums, Unions, Interfaces, Custom Scalars
 * =======================================================
 *
 * The GraphQL type system beyond basic objects and scalars. Schema-first JS
 * declares all of these in SDL; the resolvers map supplies the runtime bits that
 * SDL can't express:
 *   - custom scalar  → a GraphQLScalarType (serialize/parseValue)
 *   - union/interface→ a `__resolveType` function so the executor knows the
 *     concrete type of each value
 */

const { makeExecutableSchema } = require("@graphql-tools/schema");
const { GraphQLScalarType, Kind } = require("graphql");

// ── SDL ───────────────────────────────────────────────────────────────────────
const typeDefs = /* GraphQL */ `
  "ISO 8601 date string (YYYY-MM-DD)"
  scalar Date

  enum Genre { FICTION NON_FICTION SCIENCE HISTORY }
  enum PublishStatus { DRAFT PUBLISHED ARCHIVED }

  interface Node { id: ID! }
  interface Publishable {
    title: String!
    status: PublishStatus!
    publishedAt: Date
  }

  type Article implements Node & Publishable {
    id: ID!
    title: String!
    status: PublishStatus!
    body: String!
    genre: Genre!
    publishedAt: Date
  }

  type Video implements Node & Publishable {
    id: ID!
    title: String!
    status: PublishStatus!
    url: String!
    durationSeconds: Int!
    publishedAt: Date
  }

  "An article or a video"
  union SearchResult = Article | Video

  type Query {
    articles: [Article!]!
    article(id: ID!): Article
    search(term: String!): [SearchResult!]!
    publishedContent: [SearchResult!]!
    articlesByGenre(genre: Genre!): [Article!]!
  }
`;

// ── Custom scalar ───────────────────────────────────────────────────────────
// Serialize a JS Date out to "YYYY-MM-DD"; parse incoming strings back to Date.
const dateScalar = new GraphQLScalarType({
  name: "Date",
  description: "ISO 8601 date string (YYYY-MM-DD)",
  serialize: (value) => value.toISOString().slice(0, 10),
  parseValue: (value) => new Date(value),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

// ── In-memory data ──────────────────────────────────────────────────────────
// Enum fields hold the GraphQL enum *value name* directly (e.g. "NON_FICTION").
// `kind` tags each row so the union/interface __resolveType can discriminate.
const ARTICLES = [
  { kind: "Article", id: "a1", title: "GraphQL Basics", status: "PUBLISHED", body: "GraphQL is...", genre: "NON_FICTION", publishedAt: new Date("2024-01-15") },
  { kind: "Article", id: "a2", title: "Draft Post", status: "DRAFT", body: "WIP...", genre: "SCIENCE", publishedAt: null },
];

const VIDEOS = [
  { kind: "Video", id: "v1", title: "Intro to GraphQL Tools", status: "PUBLISHED", url: "https://example.com/v1", durationSeconds: 600, publishedAt: new Date("2024-03-20") },
];

// ── Resolvers ───────────────────────────────────────────────────────────────
const resolvers = {
  Date: dateScalar,

  // Abstract types need __resolveType to map a value to its concrete type.
  SearchResult: { __resolveType: (obj) => obj.kind },

  Query: {
    articles: () => ARTICLES,
    article: (_p, { id }) => ARTICLES.find((a) => a.id === id) ?? null,
    search: (_p, { term }) => {
      const t = term.toLowerCase();
      return [...ARTICLES, ...VIDEOS].filter((x) => x.title.toLowerCase().includes(t));
    },
    publishedContent: () => [...ARTICLES, ...VIDEOS].filter((x) => x.status === "PUBLISHED"),
    articlesByGenre: (_p, { genre }) => ARTICLES.filter((a) => a.genre === genre),
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = { schema };
