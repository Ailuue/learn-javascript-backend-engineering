# Pagination

Offset vs cursor pagination, side by side, on a seeded SQLite dataset
(Express + better-sqlite3).

| File | What it is |
|---|---|
| `db.js` | SQLite connection + schema (`articles`, `comments`) |
| `seed.js` | Inserts 50 articles + comments |
| `main.js` | `/articles/offset` and `/articles/cursor` endpoints |

## Offset vs cursor

- **Offset** (`?page=1&limit=10`): simple, supports jumping to any page, gives a
  total count. But pages shift if rows are inserted/deleted between requests, and
  it gets slower as the offset grows.
- **Cursor** (`?cursor=<token>&limit=10`): remembers the last id (`WHERE id < :id`),
  so it's stable and fast at any depth. No random access, no total count. The
  cursor is an opaque base64 token; we fetch `limit+1` rows to detect a next page.

## Run

```bash
npm install            # from the repo root (express, better-sqlite3)
node seed.js           # once — creates articles.db
node main.js           # http://localhost:8000
curl 'localhost:8000/articles/offset?page=2&limit=5'
curl 'localhost:8000/articles/cursor?limit=5'
```
