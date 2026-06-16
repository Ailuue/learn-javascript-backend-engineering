# pgvector Demo

Store and search text by meaning using vector embeddings in PostgreSQL via the
`pgvector` extension.

## What it does

1. Seeds users + comments.
2. Embeds each comment with a local Ollama model (768-dim vectors).
3. Finds semantically similar comments by cosine distance — no keyword matching.

A keyword search for "fast car" misses "quick vehicle"; embeddings encode meaning,
so similar text lands close in vector space regardless of exact words.

## Stack

| Tool | Role |
|---|---|
| PostgreSQL + pgvector | stores vectors, runs similarity queries (`<=>`) |
| [`pg`](https://node-postgres.com) + [`pgvector/pg`](https://github.com/pgvector/pgvector-node) | driver + vector type registration |
| [`ollama`](https://github.com/ollama/ollama-js) | local embedding model client |
| `nomic-embed-text` | default model (768 dimensions) |

## Setup

```bash
ollama pull nomic-embed-text          # 1. pull the embedding model
docker compose up -d                  # 2. Postgres + pgvector
npm install                           # 3. from the repo root
node setup.js                         # 4. extension + schema
node seed.js                          # 5. sample data
node embed_comments.js                # 6. embed + run a similarity search
```

## Running a similarity search

```bash
node embed_comments.js --search "something about computers learning"
node embed_comments.js --model mxbai-embed-large   # different model
```

`embedding <=> $1` is pgvector's cosine-distance operator; lower = more similar.
Switching models changes the vector dimensions — update `vector(N)` in `setup.js`
and re-embed.

