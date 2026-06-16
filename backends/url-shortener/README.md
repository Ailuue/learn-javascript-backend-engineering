# URL Shortener

Express service that shortens URLs, tracks clicks, and redirects visitors.

## Features

- JWT authentication (register, login)
- Shorten long URLs to auto-generated slugs
- HTTP redirect on slug lookup
- Click tracking via BullMQ background tasks
- Redis cache for frequently-accessed slugs
- Prisma database migrations

## Stack

| Layer | Tool |
|---|---|
| API | Express |
| Database | SQLite/PostgreSQL + Prisma |
| Migrations | Prisma Migrate |
| Cache | Redis (ioredis) |
| Background tasks | BullMQ |
| Validation | Zod |
| Auth | JWT (jsonwebtoken) |

## Structure

```
app/
  main.js       — app factory; mounts routers (redirect last, it's a catch-all)
  server.js     — network entry point (listen + cache init)
  worker.js     — BullMQ worker for click increments
  database.js   — shared Prisma client
  models        — see prisma/schema.prisma
  schemas.js    — Zod request schemas + response serializers
  shortener.js  — slug generation logic
  cache.js      — Redis helpers
  queue.js      — BullMQ queue setup
  tasks.js      — click-increment task + enqueue helper
  auth.js       — hashing, JWT, and auth middleware
  errors.js     — HttpError + error-handling middleware
  routers/
    auth.js     — register and login
    urls.js     — create and list shortened URLs
    redirect.js — slug → redirect with click tracking
prisma/
  schema.prisma — URL and user models
  migrations/   — migration scripts
```

## Setup

```bash
# From the repo root, install dependencies and generate the Prisma client
npm install
npm run prisma:generate

# Create the database schema, then run the API
cd backends/url-shortener
DATABASE_URL=file:./prisma/dev.db npx prisma migrate deploy --schema=prisma/schema.prisma
DATABASE_URL=file:./prisma/dev.db node app/server.js
```

Or run the full stack (API + Postgres + Redis + worker):

```bash
docker compose up -d
```

> The Prisma datasource is set to SQLite to keep things self-contained. For a
> Postgres deployment, switch `provider` in `prisma/schema.prisma` to
> `postgresql` and point `DATABASE_URL` at your database.
