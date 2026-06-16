# Task Queues Deep Dive (BullMQ)

Background job processing with [BullMQ](https://docs.bullmq.io) and Redis. The
core shape is producer → broker → worker: enqueue jobs, a Redis broker holds
them, and worker processes pull and run them.

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

There is **no separate result backend** and **no separate scheduler process**:
job state lives in the same Redis, and repeatable jobs are driven by Job
Schedulers attached to the queue.

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

