# Backend Learning

Concept-focused modules — each in its own folder with runnable code and
explanatory notes. The JS companion to the Python practice repo: every concept is
translated to the idiomatic 2026 Node toolchain.

## Modules

| Folder | Topics | Stack |
|---|---|---|
| [fast-api-tutorial/](fast-api-tutorial/) | Web framework basics → advanced patterns | Express + Zod + ws |
| [database-concepts/](database-concepts/) | Migrations, indexes, transactions, FTS, pgvector, pooling | pg, knex, pgvector |
| [backend-concepts/](backend-concepts/) | Auth, caching, rate limiting, pagination, webhooks, WebSockets, Kafka, OAuth2, observability | Express, ioredis, kafkajs, jsonwebtoken, pino |
| [testing-concepts/](testing-concepts/) | Test basics, mocking, DB testing, async testing | Jest |
| [docker-concepts/](docker-concepts/) | Compose, multi-stage builds, debugging, reverse proxy, security, CI/CD | Node Dockerfiles |
| [aws-concepts/](aws-concepts/) | S3, Lambda, SQS, SNS, DynamoDB | AWS SDK v3 + LocalStack |
| [graphql-concepts/](graphql-concepts/) | Schemas, relationships, dataloaders, mutations, pagination | graphql-js + dataloader |
| [grpc-concepts/](grpc-concepts/) | gRPC services with Protocol Buffers | @grpc/grpc-js + proto-loader |
| [celery-concepts/](celery-concepts/) | Task queues and workers | BullMQ + Redis |
| [email-concepts/](email-concepts/) | SMTP, IMAP, templating, testing | nodemailer, nunjucks, ImapFlow |
| [github-actions/](github-actions/) | CI/CD workflows | Node CI |
| [makefile-concepts/](makefile-concepts/) | Make patterns + npm scripts | Make + npm |

## Tests

The folders with runnable test suites (`graphql-concepts`, `testing-concepts`,
`backend-concepts/testing`, `email-concepts`) run as part of the repo's `npm test`.
The rest are runnable demos — many need a service (Redis, Postgres, Kafka,
LocalStack) via their `docker-compose.yml`.
