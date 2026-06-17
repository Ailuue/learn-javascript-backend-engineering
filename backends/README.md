# Backends

Backend projects built on Express + Prisma + Zod.

## Projects

- [bookmark_manager/](bookmark_manager/) — full Express app with auth, bookmarks, tags, categories, Redis caching, BullMQ tasks, and rate limiting
- [url-shortener/](url-shortener/) — URL shortener API with auth, Redis caching, BullMQ background tasks, and redirect tracking

Each project uses an `app/` + `prisma/` + `tests/` layout: Express for the API,
Prisma for the data layer, Zod for validation, BullMQ for background jobs, and
express-rate-limit for throttling.
