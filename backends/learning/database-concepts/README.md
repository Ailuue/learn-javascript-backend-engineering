# Database Concepts

PostgreSQL patterns, translated to the 2026 Node stack. Each folder is a
self-contained set of runnable demos.

## Stack

- [`pg`](https://node-postgres.com) (node-postgres) for raw SQL + connection pooling
- [`knex`](https://knexjs.org) for migrations
- [`pgvector`](https://github.com/pgvector/pgvector-node) + [`ollama`](https://github.com/ollama/ollama-js) for vector search
- `better-sqlite3` where a demo benefits from a zero-setup local DB

## Modules

| Folder | What it covers | Tool |
|---|---|---|
| [async_sqlalchemy/](async_sqlalchemy/) | Async queries, pool config, exhaustion, concurrency | pg `Pool` |
| [db-migration-demo/](db-migration-demo/) | Migrations: up/down, data migration, rollback | Knex + SQLite |
| [full_text_search/](full_text_search/) | `tsvector`/`tsquery`, ranking, GIN indexes | pg |
| [indexes/](indexes/) | B-tree, Hash, GIN, GiST; `EXPLAIN ANALYZE` | pg |
| [n_plus_one/](n_plus_one/) | The N+1 problem; batch IN-query vs JOIN | pg + query counter |
| [normalization/](normalization/) | 0NF → BCNF with worked schemas | pg |
| [pgvector-demo/](pgvector-demo/) | Vector similarity search with local embeddings | pg + pgvector + Ollama |
| [transactions/](transactions/) | ACID, isolation levels, savepoints, locking | pg |
| [window_functions/](window_functions/) | ROW_NUMBER, RANK, LAG, running totals | pg |

## Running

Most folders need a Postgres instance:

```bash
DB_NAME=transactions_demo docker compose up -d   # or set the folder's db name
npm install                                       # from the repo root
node transactions/01_acid.js
```

These are runnable demos (most need Postgres; pgvector also needs Ollama) — they
print results rather than being part of `npm test`. db-migration-demo runs on
SQLite with no setup.

## boto3/SQLAlchemy → pg cheat sheet

| Python | JS |
|--------|-----|
| `psycopg2.connect()` | `new Client(...)` / `new Pool(...)` |
| `cur.execute(sql, (a, b))` | `client.query(sql, [a, b])` (`$1, $2` params) |
| `conn.commit()` / `rollback()` | `client.query("COMMIT" / "ROLLBACK")` |
| SQLAlchemy async engine + pool | `pg.Pool` (`max`, `idleTimeoutMillis`, …) |
| Alembic | Knex migrations |
| `pgvector.sqlalchemy.Vector` | `pgvector/pg` + `vector(N)` columns |
