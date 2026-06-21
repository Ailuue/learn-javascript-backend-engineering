# Learning Backend Engineering with JavaScript

A public, open learning resource for backend engineering with JavaScript — from CS
fundamentals through Express, databases, auth, messaging, and AI/LLM integration,
up to full capstone projects. Every module is concept-focused, self-contained, and
runnable. Anyone is welcome to clone it, work through it at their own pace, and learn.

## Structure

| Folder | What's in it |
|---|---|
| [backends/](backends/) | Express projects and concept-focused learning modules |
| [d-structs-algos/](d-structs-algos/) | Data structures, sorting algorithms, searching, and P vs NP problems |
| [frontends/](frontends/) | React + Vite frontends that pair with backend projects |

## Suggested learning path

New here? This is the order the material is designed to be worked through. Each
step stands alone, so skip ahead if a topic is already familiar.

1. **[d-structs-algos/](d-structs-algos/)** — warm up CS fundamentals in JavaScript (no setup). 🟢
2. **[backends/learning/web-framework-tutorial/](backends/learning/web-framework-tutorial/)** — your first Express app. 🟢
3. **[backends/learning/testing-concepts/](backends/learning/testing-concepts/)** — Jest, mocking, async tests. 🟢
4. **[backends/learning/database-concepts/](backends/learning/database-concepts/)** — persistence with Prisma + Postgres. 🐘
5. **[backends/learning/backend-concepts/](backends/learning/backend-concepts/)** — auth, caching, rate limiting, pagination, real-time. 🟢/🔴
6. **Specialized topics, as needed** — ai (LLM APIs, RAG, agents), graphql, grpc, task queues, email, aws, docker, github-actions, makefile.
7. **Capstone projects** — read and run [url-shortener](backends/url-shortener/) first, then the fuller [bookmark-manager](backends/bookmark-manager/). 🐘🔴

### What each module needs to run

| Icon | Meaning |
|---|---|
| 🟢 | No infrastructure — pure Node.js, SQLite, or in-memory |
| 🐘 | PostgreSQL (the `database-concepts` folder ships a one-command shared Docker setup) |
| 🔴 | Redis |
| 🐳 | Docker / Docker Compose |
| ☁️ | An external or cloud service (a paid LLM API, AWS via LocalStack, GitHub OAuth, an SMTP server) |

Each module's README states exactly what it needs and how to start it.

## Backends

### Projects
- [bookmark-manager](backends/bookmark-manager/) — full Express app with auth, Redis, BullMQ, Prisma migrations, and rate limiting
- [url-shortener](backends/url-shortener/) — URL shortener with auth, caching, and click tracking

### Learning modules (`backends/learning/`)
- [web-framework-tutorial](backends/learning/web-framework-tutorial/) — Express basics through advanced patterns
- [database-concepts](backends/learning/database-concepts/) — Prisma & pg, migrations, indexes, transactions, full-text search, pgvector, connection pooling
- [backend-concepts](backends/learning/backend-concepts/) — auth, caching, rate limiting, pagination, webhooks, WebSockets, Kafka, OAuth2, observability
- [ai-concepts](backends/learning/ai-concepts/) — LLM APIs, prompt engineering, structured outputs, tool use, embeddings, RAG, evaluation, guardrails; Claude & OpenAI side by side (paid APIs)
- [testing-concepts](backends/learning/testing-concepts/) — Jest, mocking, database testing, async testing
- [docker-concepts](backends/learning/docker-concepts/) — multi-stage builds, Compose, debugging, reverse proxy, security, CI/CD
- [aws-concepts](backends/learning/aws-concepts/) — S3, Lambda, SQS, SNS, DynamoDB (AWS SDK v3 + LocalStack)
- [graphql-concepts](backends/learning/graphql-concepts/) — schemas, relationships, dataloaders, mutations, pagination
- [grpc-concepts](backends/learning/grpc-concepts/) — gRPC with Protocol Buffers
- [task-queue-concepts](backends/learning/task-queue-concepts/) — task queues and workers with BullMQ + Redis
- [email-concepts](backends/learning/email-concepts/) — SMTP, IMAP, templating, testing email
- [github-actions](backends/learning/github-actions/) — CI/CD workflows
- [makefile-concepts](backends/learning/makefile-concepts/) — Makefile patterns and npm scripts for backend projects

## Setup

```bash
npm install                 # all backend + learning dependencies, from the repo root
npm run prisma:generate     # build the per-project Prisma clients
npm test                    # the full Jest suite — in-memory SQLite, no infra
```

### Dependencies live in one place

There is **one root `package.json` for the whole repo**. A single `npm install`
from the root pulls every backend and learning-module dependency (Express, Prisma,
Jest, BullMQ, the AWS SDK, graphql, kafkajs, …) into a shared `node_modules`. A few
frontends and the web-framework tutorial keep their own `package.json`; install
those locally when you work inside them.

```bash
cd frontends/bookmark-manager
npm install                 # this frontend's own dependencies
npm run dev
```

Each folder's README states what it needs. Modules that require a service
(PostgreSQL, Redis, Kafka, LocalStack) ship a `docker-compose.yml` or point at a
shared one.
