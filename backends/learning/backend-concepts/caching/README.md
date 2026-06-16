# Caching

Reading from a database is slow relative to memory. **Caching** stores the result
of an expensive operation somewhere fast (Redis) so you can reuse it. The trade:
memory for speed, freshness for performance — cached data can be stale until it
expires or is invalidated.

Good caching is mostly deciding: what to cache, how long (TTL), and when to
invalidate.

## Stack

- **Redis** via [`ioredis`](https://github.com/redis/ioredis) (the cache)
- **better-sqlite3** (the "slow" source of truth — in-memory so no Postgres needed)

## What the files cover

| File | What it teaches |
|---|---|
| `01_cache_aside.js` | Check cache, fall back to DB on a miss, write back; invalidate on write |
| `02_write_through.js` | Write to cache and DB together — cache never cold |
| `03_write_behind.js` | Write to cache, flush to DB in the background — fastest, lossy |
| `04_invalidation.js` | TTL, event-driven, and versioned-key invalidation |
| `05_stampede.js` | The thundering-herd problem and a Redis-lock fix |

`db.js` is the SQLite source of truth; `cache.js` holds the ioredis client + key/serialisation helpers.

## How to run

```bash
docker compose up -d          # Redis on :6379
npm install                   # from the repo root
node 01_cache_aside.js
node 05_stampede.js
```

