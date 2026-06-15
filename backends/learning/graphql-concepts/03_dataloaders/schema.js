/**
 * 03 · DataLoaders — solving N+1
 * ===============================
 *
 * Same schema as section 02, but Post.author now uses a DataLoader pulled from
 * the per-request context instead of querying the DB directly.
 *
 * When graphql-js resolves a list of posts, it invokes every Post.author
 * resolver synchronously (each returns a promise from loader.load). The
 * DataLoader accumulates all the authorId keys during that tick, then fires a
 * single batch query for all of them. 6 lookups → 1 batch call.
 */

const { makeExecutableSchema } = require("@graphql-tools/schema");
const db = require("./data");
const { makeAuthorLoader } = require("./loaders");

const typeDefs = /* GraphQL */ `
  type Author {
    id: ID!
    name: String!
    bio: String!
  }

  type Post {
    id: ID!
    title: String!
    body: String!
    author: Author
  }

  type Query {
    posts: [Post!]!
    post(id: ID!): Post
  }
`;

const resolvers = {
  Query: {
    posts: () => db.posts,
    post: (_p, { id }) => db.posts.find((p) => p.id === id) ?? null,
  },
  Post: {
    // load() schedules a key for batching; all load() calls in one tick batch
    // together, and identical keys are de-duplicated by the loader's cache.
    author: (post, _args, context) => context.authorLoader.load(post.authorId),
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create a fresh context (with a new DataLoader) for each request.
function makeContext() {
  return { authorLoader: makeAuthorLoader() };
}

module.exports = { schema, makeContext };
