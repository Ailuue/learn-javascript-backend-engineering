# Kafka

Event streaming with [KafkaJS](https://kafka.js.org). Kafka is a distributed,
append-only commit log: producers append messages to topic partitions, consumers
read by offset, and nothing is deleted on read — which makes fan-out free.

## Stack

- **KafkaJS** producer / consumer / admin clients (`kafka.js`)
- Kafka broker in KRaft mode via `docker-compose.yml`

## What the files cover

| File | What it teaches |
|---|---|
| `01_producer.js` | `producer.send`, `acks`, keyed vs unkeyed messages, batch send |
| `02_consumer.js` | `subscribe` + `run`, `fromBeginning`, manual `commitOffsets` (at-least-once) |
| `03_consumer_groups.js` | work queue (same group) vs fan-out (different groups) |
| `04_partitions.js` | admin `createTopics`, key→partition routing, reading one partition |
| `05_express.js` | HTTP endpoint that publishes events (decoupling pattern) |
| `worker.js` | Background consumer that processes order events, idempotent, manual commit |

## Run

```bash
docker compose up -d        # Kafka on :9092 (wait ~10s)
npm install                 # from the repo root
node 01_producer.js
node 02_consumer.js
# event-driven demo:
node 05_express.js          # terminal A
node worker.js              # terminal B
curl -sX POST localhost:8000/orders -H 'Content-Type: application/json' \
  -d '{"item":"keyboard","quantity":2,"customer_id":"cust-42"}'
```

## kafka-python → KafkaJS

| kafka-python | KafkaJS |
|--------------|---------|
| `KafkaProducer(...).send(topic, value, key)` | `producer.send({ topic, messages: [{ key, value }] })` |
| `KafkaConsumer(topic, group_id=...)` | `kafka.consumer({ groupId }); subscribe; run({ eachMessage })` |
| `enable_auto_commit=False` + `commit()` | `run({ autoCommit: false })` + `commitOffsets` |
| `KafkaAdminClient().create_topics` | `kafka.admin().createTopics` |
| `auto_offset_reset="earliest"` | `subscribe({ fromBeginning: true })` |
