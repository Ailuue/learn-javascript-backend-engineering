# SQS — Simple Queue Service

SQS is a managed message queue. Producers push messages; consumers poll and
process them. It decouples services: the producer doesn't care whether the
consumer is running or how fast it processes.

## Key concepts

- **Queue** — a buffer of messages. Two types:
  - **Standard** — at-least-once delivery, best-effort ordering, high throughput.
  - **FIFO** — exactly-once, strict ordering, lower throughput, `.fifo` suffix.
- **Visibility timeout** — after a consumer receives a message it's hidden from
  others for N seconds. If not deleted in time, it reappears (retry). Prevents
  double-processing.
- **Dead letter queue (DLQ)** — a separate queue for messages that fail too many
  times. Keeps poison-pill messages from blocking the queue forever.
- **Long polling** — SQS waits up to 20s for a message instead of returning empty
  immediately, cutting empty responses and API costs.

## What the files cover

| File | What it teaches |
|------|----------------|
| `01_queues.js` | Create standard and FIFO queues, read attributes, delete |
| `02_messages.js` | Send, batch-send, receive, delete; visibility-timeout behaviour |
| `03_dead_letter.js` | Wire a DLQ via redrive policy, simulate failures, inspect stuck messages |

## How to run

```bash
node sqs/01_queues.js
node sqs/02_messages.js
node sqs/03_dead_letter.js
```
