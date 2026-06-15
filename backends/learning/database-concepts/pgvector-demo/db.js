// Postgres pool with the pgvector type registered on every connection.
// pgvector/pg teaches node-postgres how to read/write the `vector` type;
// `toSql([...])` formats a JS array as a pgvector literal for parameters.

const { Pool } = require("pg");
const pgvector = require("pgvector/pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "pgvector_demo",
  user: process.env.DB_USER || process.env.USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

// Register the vector type on each new pooled connection.
pool.on("connect", (client) => pgvector.registerTypes(client));

module.exports = { pool, toSql: pgvector.toSql };
