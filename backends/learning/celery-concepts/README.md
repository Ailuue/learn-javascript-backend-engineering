# Task Queues Deep Dive (BullMQ)

Background job processing with [BullMQ](https://docs.bullmq.io) and Redis — the
Node equivalent of Celery. Same ideas (producer → broker → worker), expressed the
JavaScript way.

## Architecture

```
Producer (your code)
    │
    │  queue.add(name, data, opts)
    ▼
Redis (queue + job state)
    │
    │  worker pulls the next job
    ▼
Worker (processor function)
    │
    │  return value / failedReason stored on the job in Redis
    ▼
Producer reads it via job.waitUntilFinished(queueEvents)
```

Unlike Celery there is **no separate result backend** and **no separate beat
process**: job state lives in the same Redis, and repeatable jobs are driven by
Job Schedulers attached to the queue.

## Setup

```bash
npm install          # from the repo root
docker compose up    # start Redis (+ redis-commander UI on :8081)
```

## Concept files

| File | Concept | Run |
|------|---------|-----|
| [01_basic_tasks.js](01_basic_tasks.js) | Queues, workers, `queue.add`, delayed jobs, `waitUntilFinished` | `node 01_basic_tasks.js` |
| [02_task_states.js](02_task_states.js) | Job lifecycle, `updateProgress`, `QueueEvents`, `failedReason` | `node 02_task_states.js` |
| [03_retries.js](03_retries.js) | `attempts`, exponential/custom backoff, `UnrecoverableError` | `node 03_retries.js` |
| [04_workflows.js](04_workflows.js) | Flows: chains, groups, fan-in (`getChildrenValues`) | `node 04_workflows.js` |
| [05_periodic_tasks.js](05_periodic_tasks.js) | Job Schedulers (`upsertJobScheduler`), interval + cron | `node 05_periodic_tasks.js` |

Each file is self-contained: it starts its own in-process worker, runs the demo,
and cleans up — so a single `node <file>` shows the full round-trip (just keep
Redis running).

## Celery → BullMQ cheat sheet

| Celery | BullMQ |
|--------|--------|
| `@app.task` + `add.delay(x, y)` | `queue.add("add", { x, y })` |
| `apply_async(countdown=10)` | `queue.add(name, data, { delay: 10000 })` |
| `AsyncResult.get()` | `job.waitUntilFinished(queueEvents)` |
| `self.update_state(meta=…)` | `job.updateProgress(…)` |
| `autoretry_for` / `self.retry()` | `{ attempts, backoff }` job options |
| give up early | throw `UnrecoverableError` |
| `chain(a, b, c)` | nested `FlowProducer` tree |
| `group(a, b, c)` | add N jobs, `Promise.all(waitUntilFinished)` |
| `chord(group, cb)` | flow: `cb` parent, group as children |
| Celery Beat `beat_schedule` | `queue.upsertJobScheduler(id, repeat, tmpl)` |
