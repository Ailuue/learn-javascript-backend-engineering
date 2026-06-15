/**
 * GraphQL Playground Server
 * ==========================
 *
 * Mounts each section's schema at its own URL so you can explore them
 * interactively. Uses Express + `graphql-http` (the spec-compliant, framework-
 * agnostic handler) and serves the GraphiQL IDE from a CDN.
 *
 * Run:
 *   npm install                 (from the repo root)
 *   node backends/learning/graphql-concepts/app.js
 *
 * Then open:
 *   http://localhost:8000/            ← index listing all sections
 *   http://localhost:8000/01/graphql  ← section 01 GraphiQL IDE (GET) / endpoint (POST)
 */

const express = require("express");
const { createHandler } = require("graphql-http/lib/use/express");

const app = express();

const SECTIONS = [
  ["01", "01_schema_basics", "Schema Basics — types, queries, mutations"],
  ["02", "02_relationships", "Relationships & N+1 — resolver methods, N+1 problem"],
  ["03", "03_dataloaders", "DataLoaders — batching to solve N+1"],
  ["04", "04_types", "Types — enums, unions, interfaces, custom scalars"],
  ["05", "05_mutations", "Mutations — CRUD and typed error handling"],
  ["06", "06_pagination", "Pagination — offset and cursor (Relay) patterns"],
];

// GraphiQL IDE served from CDN — points at the section's own /graphql endpoint.
const graphiql = (endpoint) => `<!DOCTYPE html>
<html><head><title>GraphiQL ${endpoint}</title>
<link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" /></head>
<body style="margin:0"><div id="graphiql" style="height:100vh"></div>
<script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
<script>
  const fetcher = GraphiQL.createFetcher({ url: "${endpoint}" });
  ReactDOM.render(React.createElement(GraphiQL, { fetcher }), document.getElementById("graphiql"));
</script></body></html>`;

for (const [prefix, dir] of SECTIONS) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { schema } = require(`./${dir}/schema`);
  const context = dir === "03_dataloaders" ? require(`./${dir}/schema`).makeContext : undefined;
  const endpoint = `/${prefix}/graphql`;

  // GET → GraphiQL IDE; POST → execute the query.
  app.get(endpoint, (_req, res) => res.type("html").send(graphiql(endpoint)));
  app.post(endpoint, createHandler({ schema, context: context && (() => context()) }));
}

app.get("/", (_req, res) => {
  res.json({
    sections: SECTIONS.map(([prefix, , title]) => ({
      title,
      playground: `http://localhost:8000/${prefix}/graphql`,
    })),
  });
});

if (require.main === module) {
  app.listen(8000, () => console.log("GraphQL playground on http://localhost:8000"));
}

module.exports = { app };
