# Testing (Integration)

A production-style API test suite: Express + Zod + better-sqlite3, tested with
**Jest + supertest**. The companion to `learning/testing-concepts/` — that one
teaches the tools; this one applies them to a real Posts API.

The three core decisions in any DB-backed API test suite:

1. **Which database** — a real Postgres test DB is most faithful; here we use
   in-memory SQLite so the suite runs anywhere with no setup. (SQLite differs
   subtly from Postgres — fine for teaching, worth knowing in production.)
2. **Isolation** — each test runs inside a `SAVEPOINT` rolled back afterwards
   (`tests/helpers.js`), so every test starts clean. Fast, no truncation.
3. **Sharing the connection** — supertest drives the in-process Express app,
   which imports the same `app/db.js`, so the app and tests see the same data.

## Layout

| Path | What it is |
|---|---|
| `app/db.js` | In-memory SQLite + schema |
| `app/schemas.js` | Zod request schemas (Pydantic equivalent) |
| `app/main.js` | Express app: auth middleware, ownership checks, CRUD |
| `tests/helpers.js` | Savepoint isolation + `makeUser`/`makePost` factories |
| `tests/auth.test.js` | 401 (no/unknown user) and 403 (not owner) |
| `tests/posts.test.js` | CRUD happy paths + response *and* DB-state assertions |
| `tests/validation.test.js` | 422 for bad bodies; documents Zod's boundaries |

## Run

```bash
npm test                                                  # whole repo
npx jest backends/learning/backend-concepts/testing       # this suite
```

## FastAPI/pytest → Express/Jest

| Python | JS |
|--------|-----|
| Pydantic `BaseModel` | Zod schema + `safeParse` |
| `Depends(get_current_user)` | `authenticate` middleware |
| `TestClient(app)` | `supertest(app)` |
| transaction-rollback `db` fixture | `SAVEPOINT` / `ROLLBACK TO` in beforeEach/afterEach |
| factory fixtures | `makeUser` / `makePost` helpers |
| missing required header → 422 | missing header → 401 (idiomatic; 422 is for body validation) |
