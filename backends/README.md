# Backends

JavaScript translations of the Python backend projects, built on Express +
Prisma + Zod.

## Projects

- [bookmark_manager/](bookmark_manager/) — full Express app with auth, bookmarks, tags, categories, Redis caching, BullMQ tasks, and rate limiting
- [url-shortener/](url-shortener/) — URL shortener API with auth, Redis caching, BullMQ background tasks, and redirect tracking

Each project keeps the same `app/` + `prisma/` + `tests/` layout as its Python
counterpart, translating FastAPI → Express, SQLModel/SQLAlchemy → Prisma,
Pydantic → Zod, Celery → BullMQ, and slowapi → express-rate-limit.
