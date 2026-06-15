// Knex configuration. Knex is the 2026 JS analog of Alembic: imperative
// migrations with explicit up()/down() functions and a CLI to apply/roll back.
// SQLite (better-sqlite3) keeps the demo self-contained.

const path = require("path");

module.exports = {
  development: {
    client: "better-sqlite3",
    connection: { filename: path.join(__dirname, "library.db") },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, "migrations") },
    seeds: { directory: path.join(__dirname, "seeds") },
  },
};
